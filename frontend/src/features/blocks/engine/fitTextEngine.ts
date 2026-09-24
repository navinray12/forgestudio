export interface FitTextOptions {
  minFontSize?: number;
  maxFontSize?: number;
  fontRatio?: number;
}

export class FitTextEngine {
  /**
   * Calculates optical font size in pixels given container width and text character length.
   */
  static calculateFontSize(
    containerWidth: number,
    textLength: number,
    options: FitTextOptions = {}
  ): number {
    const minSize = options.minFontSize ?? 12;
    const maxSize = options.maxFontSize ?? 120;
    const fontRatio = options.fontRatio ?? 0.6; // Average character width to height ratio

    if (!containerWidth || containerWidth <= 0 || !textLength || textLength <= 0) {
      return minSize;
    }

    // Formula: containerWidth / (characterCount * fontRatio)
    const rawFontSize = containerWidth / (textLength * fontRatio);
    const clamped = Math.min(maxSize, Math.max(minSize, rawFontSize));

    return Math.round(clamped * 10) / 10;
  }

  /**
   * Safe ResizeObserver binder that applies calculated font size to DOM element without triggering infinite loops.
   */
  static observeAndFit(
    element: HTMLElement,
    text: string,
    options: FitTextOptions = {},
    onCalculated?: (fontSize: number) => void
  ): () => void {
    if (!element || typeof window === "undefined" || !("ResizeObserver" in window)) {
      return () => {};
    }

    let animationFrameId: number | null = null;

    const updateFit = () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);

      animationFrameId = requestAnimationFrame(() => {
        const width = element.clientWidth;
        const length = (text || element.textContent || "").trim().length;
        if (width > 0 && length > 0) {
          const fontSize = FitTextEngine.calculateFontSize(width, length, options);
          element.style.fontSize = `${fontSize}px`;
          if (onCalculated) onCalculated(fontSize);
        }
      });
    };

    const resizeObserver = new ResizeObserver(() => {
      updateFit();
    });

    resizeObserver.observe(element);
    updateFit();

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
    };
  }
}
