import { desc, eq, gt, inArray } from "drizzle-orm";
import { db } from "../client";
import {
	type Deployment,
	type DeploymentChange,
	deploymentChanges,
	deployments,
	type NewDeploymentChange,
} from "../schema";

export async function trackChange(
	change: NewDeploymentChange,
): Promise<DeploymentChange> {
	const result = await db.insert(deploymentChanges).values(change).returning();
	return result[0];
}

export async function getLastDeployment(): Promise<Deployment | null> {
	const result = await db
		.select()
		.from(deployments)
		.where(eq(deployments.status, "completed"))
		.orderBy(desc(deployments.completedAt))
		.limit(1);
	return result[0] ?? null;
}

export async function getPendingChanges(
	lastDeployment?: Deployment | null,
): Promise<DeploymentChange[]> {
	const last =
		lastDeployment !== undefined ? lastDeployment : await getLastDeployment();
	const since = last?.completedAt;

	if (!since) {
		return await db
			.select()
			.from(deploymentChanges)
			.orderBy(desc(deploymentChanges.createdAt));
	}

	return await db
		.select()
		.from(deploymentChanges)
		.where(gt(deploymentChanges.createdAt, since))
		.orderBy(desc(deploymentChanges.createdAt));
}

const DEPLOY_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

export async function getActiveDeployment(): Promise<Deployment | null> {
	const result = await db
		.select()
		.from(deployments)
		.where(inArray(deployments.status, ["pending", "building"]))
		.orderBy(desc(deployments.createdAt))
		.limit(1);

	const active = result[0] ?? null;

	// Auto-expire stuck deployments
	if (active) {
		const elapsed = Date.now() - new Date(active.createdAt).getTime();
		if (elapsed > DEPLOY_TIMEOUT_MS) {
			await updateDeploymentStatus(active.id, "failed");
			return null;
		}
	}

	return active;
}

export async function cancelDeployment(
	id: number,
): Promise<Deployment | undefined> {
	return updateDeploymentStatus(id, "failed");
}

export async function createDeployment(
	source: "dashboard" | "local" | "ci",
	changesCount: number,
): Promise<Deployment> {
	const result = await db
		.insert(deployments)
		.values({ source, changesCount, status: "pending" })
		.returning();
	return result[0];
}

export async function updateDeploymentStatus(
	id: number,
	status: "building" | "completed" | "failed",
): Promise<Deployment | undefined> {
	const result = await db
		.update(deployments)
		.set({
			status,
			...(status === "completed" || status === "failed"
				? { completedAt: new Date() }
				: {}),
		})
		.where(eq(deployments.id, id))
		.returning();
	return result[0];
}
