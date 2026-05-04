/** Session flag: user opened product from a card while the 2nd hover image was visible (hover-capable UA). */

export function galleryImageIndexStorageKey(slug: string) {
  return `ansin:imgIndex:${slug}`;
}

function parseStoredGalleryImageIndex(raw: string | null): number | null {
  if (raw == null) return null;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : null;
}

export function consumeStoredGalleryImageIndex(slug: string): number | null {
  const key = galleryImageIndexStorageKey(slug);
  const raw = sessionStorage.getItem(key);
  if (raw == null) return null;
  sessionStorage.removeItem(key);
  return parseStoredGalleryImageIndex(raw);
}

function peekStoredGalleryImageIndex(slug: string): number | null {
  return parseStoredGalleryImageIndex(
    sessionStorage.getItem(galleryImageIndexStorageKey(slug)),
  );
}

/** Astro View Transitions — incoming document before DOM swap. */
interface AstroBeforeSwapEvent extends Event {
  readonly newDocument?: Document;
}

/** Align incoming product page DOM with the hovered card image before the VT snapshot runs. */
export function patchGalleryDocumentBeforeSwap(doc: Document) {
  const gallery = doc.querySelector("[data-gallery]");
  if (!(gallery instanceof HTMLElement)) return;

  const slug = gallery.dataset.slug;
  if (!slug) return;

  const idx = peekStoredGalleryImageIndex(slug);
  if (idx == null || idx <= 0) return;

  const mainImg = gallery.querySelector<HTMLImageElement>("[data-main-image]");
  const thumbBtn = gallery.querySelector<HTMLElement>(
    `[data-thumbnail-index="${idx}"]`,
  );
  if (!mainImg || !thumbBtn) return;

  const highSrc =
    thumbBtn.getAttribute("data-main-high-src") ||
    thumbBtn.getAttribute("data-full-src");
  const lowSrc = thumbBtn.getAttribute("data-main-low-src");

  mainImg.classList.remove("gallery-main-high-loaded");
  if (highSrc) mainImg.src = highSrc;
  else if (lowSrc) mainImg.src = lowSrc;
}

let beforeSwapListenerInstalled = false;

export function installGalleryBeforeSwapPatch() {
  if (beforeSwapListenerInstalled) return;
  beforeSwapListenerInstalled = true;

  document.addEventListener("astro:before-swap", (event: Event) => {
    const doc = (event as AstroBeforeSwapEvent).newDocument;
    if (doc) patchGalleryDocumentBeforeSwap(doc);
  });
}

/**
 * Second-card preview + VT handoff: Tailwind `lg` (same as Gallery desktop) and fine-pointer hover.
 * Decorative card hover (shadow, scale) uses `(hover: hover)` only — see ProductCard styles.
 */
export const CARD_SECOND_IMAGE_MEDIA =
  "(min-width: 1024px) and (hover: hover)";

export function initProductCardImageTracking() {
  document.querySelectorAll(".product-card").forEach((card) => {
    const link = card.querySelector<HTMLAnchorElement>("[data-product-link]");
    const imageContainer = card.querySelector("[data-image-container]");
    const imageWrappers = Array.from(
      imageContainer?.querySelectorAll<HTMLElement>("[data-image-wrapper]") ??
        [],
    );
    const slug = card.getAttribute("data-product-slug");

    if (!link || imageWrappers.length === 0 || !slug) return;

    const vtName = `productImage-${slug}`;
    let hoveredImageIndex = 0;
    let isNavigating = false;

    const mqSecondImage = window.matchMedia(CARD_SECOND_IMAGE_MEDIA);

    const clearSecondImageVt = () => {
      hoveredImageIndex = 0;
      if (imageWrappers.length > 1) {
        imageWrappers[1].style.viewTransitionName = "";
        imageWrappers[0].style.viewTransitionName = "";
        imageWrappers[1].style.transition = "";
        imageWrappers[1].style.opacity = "";
      }
    };

    mqSecondImage.addEventListener("change", () => {
      if (!mqSecondImage.matches) clearSecondImageVt();
    });

    const preloadWrapper = (wrapper: HTMLElement) => {
      const img = wrapper.querySelector("img");
      if (!(img instanceof HTMLImageElement) || img.dataset.preloaded === "true")
        return;
      const pre = new Image();
      pre.src = img.currentSrc || img.src;
      img.dataset.preloaded = "true";
    };

    imageContainer?.addEventListener("mouseenter", () => {
      if (imageWrappers.length <= 1 || !mqSecondImage.matches) return;

      hoveredImageIndex = 1;
      preloadWrapper(imageWrappers[1]);
      imageWrappers[0].style.viewTransitionName = "none";
      imageWrappers[1].style.viewTransitionName = vtName;
    });

    imageContainer?.addEventListener("mouseleave", () => {
      if (isNavigating) return;

      hoveredImageIndex = 0;
      if (imageWrappers.length > 1) {
        imageWrappers[1].style.viewTransitionName = "";
        imageWrappers[0].style.viewTransitionName = "";
        imageWrappers[1].style.transition = "";
        imageWrappers[1].style.opacity = "";
      }
    });

    link.addEventListener("mouseenter", () => {
      preloadWrapper(imageWrappers[hoveredImageIndex] ?? imageWrappers[0]);
    });

    link.addEventListener("click", () => {
      isNavigating = true;
      if (hoveredImageIndex === 1 && imageWrappers.length > 1) {
        imageWrappers[1].style.transition = "none";
        imageWrappers[1].style.opacity = "1";
      }
      if (hoveredImageIndex > 0) {
        sessionStorage.setItem(
          galleryImageIndexStorageKey(slug),
          String(hoveredImageIndex),
        );
      }
    });
  });
}
