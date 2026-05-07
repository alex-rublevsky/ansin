const DESKTOP_ZOOM_FACTOR = 1.8;

interface SetupDesktopMagnifierOptions {
  zoomContainer: HTMLElement;
  zoomLens: HTMLElement;
  mainImage: HTMLImageElement;
  isEnabled?: () => boolean;
}

export function setupDesktopMagnifier({
  zoomContainer,
  zoomLens,
  mainImage,
  isEnabled = () => true,
}: SetupDesktopMagnifierOptions) {
  const zoomSurface = zoomLens.querySelector<HTMLElement>(
    "[data-zoom-lens-surface]",
  );

  if (!zoomSurface) {
    const noop = () => {};
    return { deactivateZoom: noop, destroy: noop };
  }

  /** Without this, loupe mixes against the stacked main `img`, not `--background`. */
  const revealMainBehindLoupe = () => {
    mainImage.style.visibility = "";
  };

  let pointerInside = false;
  const isZoomExcludedTarget = (target: EventTarget | null) =>
    target instanceof Element &&
    !!target.closest("[data-disable-gallery-zoom]");

  const deactivateZoom = () => {
    zoomLens.classList.remove("zoom-active");
    zoomSurface.style.backgroundImage = "";
    zoomSurface.style.backgroundSize = "";
    zoomSurface.style.backgroundPosition = "";
    revealMainBehindLoupe();
  };

  const canUseZoom = () => {
    if (isEnabled()) return true;
    deactivateZoom();
    return false;
  };

  const activateZoom = () => {
    if (!canUseZoom()) return false;
    if (!mainImage.classList.contains("gallery-main-high-loaded"))
      return false;
    zoomSurface.style.backgroundImage = `url('${mainImage.src}')`;
    zoomSurface.style.backgroundSize = `${DESKTOP_ZOOM_FACTOR * 100}%`;
    mainImage.style.visibility = "hidden";
    zoomLens.classList.add("zoom-active");
    return true;
  };

  const handleMouseEnter = (e: MouseEvent) => {
    pointerInside = true;
    if (isZoomExcludedTarget(e.target)) {
      deactivateZoom();
      return;
    }
    activateZoom();
  };

  const handleMouseLeave = () => {
    pointerInside = false;
    deactivateZoom();
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!canUseZoom()) return;
    if (isZoomExcludedTarget(e.target)) {
      deactivateZoom();
      return;
    }
    if (!zoomLens.classList.contains("zoom-active") && !activateZoom()) return;
    const rect = zoomContainer.getBoundingClientRect();
    const xPct = Math.min(
      Math.max(((e.clientX - rect.left) / rect.width) * 100, 0),
      100,
    );
    const yPct = Math.min(
      Math.max(((e.clientY - rect.top) / rect.height) * 100, 0),
      100,
    );
    zoomSurface.style.backgroundPosition = `${xPct}% ${yPct}%`;
  };

  const handleHighReady = () => {
    if (pointerInside) activateZoom();
  };

  zoomContainer.addEventListener("mouseenter", handleMouseEnter);
  zoomContainer.addEventListener("mouseleave", handleMouseLeave);
  zoomContainer.addEventListener("mousemove", handleMouseMove);
  mainImage.addEventListener("gallery:high-ready", handleHighReady);

  const destroy = () => {
    pointerInside = false;
    deactivateZoom();
    zoomContainer.removeEventListener("mouseenter", handleMouseEnter);
    zoomContainer.removeEventListener("mouseleave", handleMouseLeave);
    zoomContainer.removeEventListener("mousemove", handleMouseMove);
    mainImage.removeEventListener("gallery:high-ready", handleHighReady);
  };

  return { deactivateZoom, destroy };
}
