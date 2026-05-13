import type { Alpine } from "alpinejs";
import { actions } from "astro:actions";
import { generateWeightSteps } from "@/lib/variations";

type ProductVariationInput = {
  weight: number;
  price: number;
};

type ProductFormErrorField =
  | "form"
  | "name"
  | "categoryId"
  | "description"
  | "volume"
  | "cakeVolume"
  | "variations";

type ButtonState = "idle" | "loading" | "success" | "error";

type DropzoneElement = HTMLElement & {
  _dropzoneHandler?: {
    getImages: () => string[];
    hasActiveUploads: () => boolean;
  };
};

function getInputValue(form: HTMLFormElement, name: string): string {
  return String(new FormData(form).get(name) ?? "");
}

function getNumberValue(form: HTMLFormElement, name: string): number {
  const parsed = Number(getInputValue(form, name));
  return Number.isFinite(parsed) ? parsed : 0;
}

function getDropzone(): DropzoneElement | null {
  return document.querySelector<DropzoneElement>("[data-images-dropzone]");
}

function markImagesCommitted(): void {
  const dropzone = getDropzone();
  if (dropzone) dropzone.dataset.committed = "true";
}

async function refreshDashboardAndNavigate(): Promise<void> {
  await fetch("/dashboard", { cache: "reload" }).catch(() => {});
  window.location.assign("/dashboard");
}

function parseExistingVariations(
  raw: string | undefined,
): ProductVariationInput[] {
  try {
    const parsed = JSON.parse(raw ?? "[]") as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(
        (item): item is ProductVariationInput =>
          typeof item === "object" &&
          item !== null &&
          typeof (item as ProductVariationInput).weight === "number" &&
          typeof (item as ProductVariationInput).price === "number",
      )
      .map((item) => ({ weight: item.weight, price: item.price }));
  } catch {
    return [];
  }
}

export function registerProductFormData(Alpine: Alpine): void {
  Alpine.data("productForm", () => ({
    productId: null as number | null,

    name: "",
    description: "",
    volume: 0,
    cakeVolume: 0,
    categoryId: "" as string,
    isActive: true,
    priceByWeight: {} as Record<number, number | undefined>,

    errors: {} as Partial<Record<ProductFormErrorField, string>>,
    saveState: "idle" as ButtonState,
    deleteState: "idle" as ButtonState,

    init() {
      const form = this.$root as HTMLFormElement;

      this.productId = form.dataset.productId
        ? Number(form.dataset.productId)
        : null;
      this.name = getInputValue(form, "name");
      this.description = getInputValue(form, "description");
      this.volume = getNumberValue(form, "volume");
      this.cakeVolume = getNumberValue(form, "cakeVolume");
      this.categoryId = getInputValue(form, "categoryId");
      this.isActive = new FormData(form).has("isActive");

      for (const variation of parseExistingVariations(
        form.dataset.variations,
      )) {
        this.priceByWeight[variation.weight] = variation.price;
      }

      this.$watch("name", () => this.clearError("name"));
      this.$watch("categoryId", () => this.clearError("categoryId"));
      this.$watch("description", () => this.clearError("description"));
      this.$watch("volume", () => {
        this.clearError("volume");
        this.clearError("variations");
      });
      this.$watch("cakeVolume", () => {
        this.clearError("cakeVolume");
        this.clearError("variations");
      });
    },

    get weightSteps(): number[] {
      return generateWeightSteps(this.volume, this.cakeVolume);
    },

    get needsVariations(): boolean {
      return this.weightSteps.length > 0;
    },

    get saveLabel(): string {
      if (this.saveState === "loading") return "Сохранение...";
      if (this.saveState === "success") return "Сохранено";
      if (this.saveState === "error") return "Ошибка";
      return "Сохранить";
    },

    get deleteLabel(): string {
      if (this.deleteState === "loading") return "Удаление...";
      if (this.deleteState === "success") return "Удалено";
      if (this.deleteState === "error") return "Ошибка";
      return "Удалить товар";
    },

    pricePerGram(weight: number): string {
      const price = this.priceByWeight[weight];
      return price && price > 0 ? (price / weight).toFixed(2) : "—";
    },

    setError(field: ProductFormErrorField, message: string): void {
      this.errors = { ...this.errors, [field]: message };
    },

    clearError(field: ProductFormErrorField): void {
      if (!this.errors[field]) return;
      const next = { ...this.errors };
      delete next[field];
      this.errors = next;
    },

    clearErrors(): void {
      this.errors = {};
    },

    validate(): boolean {
      this.clearErrors();
      let ok = true;

      if (!this.name.trim()) {
        this.setError("name", "Обязательное поле");
        ok = false;
      }

      if (!this.description.trim()) {
        this.setError("description", "Обязательное поле");
        ok = false;
      }

      if (!this.volume || this.volume < 0) {
        this.setError("volume", "Введите корректный объём");
        ok = false;
      }

      if (this.cakeVolume < 0) {
        this.setError("cakeVolume", "Введите корректный объём блина");
        ok = false;
      }

      for (const weight of this.weightSteps) {
        const price = this.priceByWeight[weight];
        if (price === undefined || Number.isNaN(price) || price <= 0) {
          this.setError("variations", "Введите цену для всех вариаций");
          ok = false;
          break;
        }
      }

      return ok;
    },

    getVariationsPayload(): ProductVariationInput[] {
      return this.weightSteps.map((weight) => ({
        weight,
        price: this.priceByWeight[weight] ?? 0,
      }));
    },

    getPayload() {
      const dropzone = getDropzone();

      return {
        name: this.name.trim(),
        description: this.description.trim(),
        volume: this.volume || 0,
        cakeVolume: this.cakeVolume || 0,
        categoryId: this.categoryId ? Number(this.categoryId) : null,
        isActive: this.isActive,
        images: dropzone?._dropzoneHandler?.getImages() ?? [],
        variations: this.getVariationsPayload(),
      };
    },

    async save(): Promise<void> {
      if (this.saveState === "loading") return;
      this.description = getInputValue(
        this.$root as HTMLFormElement,
        "description",
      );

      const dropzone = getDropzone();
      if (dropzone?._dropzoneHandler?.hasActiveUploads()) {
        this.setError("form", "Дождитесь окончания загрузки изображений.");
        return;
      }

      if (!this.validate()) return;

      this.saveState = "loading";
      const payload = this.getPayload();
      const result =
        this.productId === null
          ? await actions.dashboard.createProduct(payload)
          : await actions.dashboard.updateProduct({
              ...payload,
              id: this.productId,
            });

      if (result.error) {
        this.saveState = "error";
        this.setError("form", result.error.message);
        window.setTimeout(() => (this.saveState = "idle"), 2000);
        return;
      }

      markImagesCommitted();
      this.saveState = "success";
      window.setTimeout(() => {
        void refreshDashboardAndNavigate();
      }, 300);
    },

    async deleteProduct(): Promise<void> {
      if (this.productId === null || this.deleteState === "loading") return;
      if (!window.confirm("Удалить товар?")) return;

      this.clearErrors();
      this.deleteState = "loading";

      const result = await actions.dashboard.deleteProduct({
        id: this.productId,
      });

      if (result.error) {
        this.deleteState = "error";
        this.setError("form", result.error.message);
        window.setTimeout(() => (this.deleteState = "idle"), 2000);
        return;
      }

      markImagesCommitted();
      this.deleteState = "success";
      window.setTimeout(() => {
        void refreshDashboardAndNavigate();
      }, 300);
    },
  }));
}
