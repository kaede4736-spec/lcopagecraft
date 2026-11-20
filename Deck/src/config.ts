// Product name lives in one place so it can change before launch.
export const BRAND = "Deck";

export type PlanId = "free" | "starter" | "pro" | "pass";
export type ExportFormat = "png" | "pdf" | "flipbook";

export interface Plan {
  id: PlanId;
  name: string;
  priceLabel: string;
  /** null = unlimited */
  decksPerPeriod: number | null;
  period: "month" | "pass";
  exports: ExportFormat[];
  /** How many document forms (report, proposal, marketing, planning) are open. */
  forms: number;
  watermark: boolean;
  brandKit: boolean;
  videoSave: boolean;
  aiPolishPerMonth: number;
}

// Mirrors "LCO 요금제 책정" (2026-11-15). The doc's "5 themes" maps to the 4 form palettes + brand color.
// Free's form count is not in the doc: assumed 2.
export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free", name: "Free", priceLabel: "$0",
    decksPerPeriod: 3, period: "month", exports: ["png"],
    forms: 2, watermark: true, brandKit: false, videoSave: false, aiPolishPerMonth: 0,
  },
  starter: {
    id: "starter", name: "Starter", priceLabel: "$10/mo · $96/yr",
    decksPerPeriod: 30, period: "month", exports: ["png", "pdf"],
    forms: 4, watermark: false, brandKit: false, videoSave: false, aiPolishPerMonth: 0,
  },
  pro: {
    id: "pro", name: "Pro", priceLabel: "$20/mo · $180/yr",
    decksPerPeriod: null, period: "month", exports: ["png", "pdf", "flipbook"],
    forms: 4, watermark: false, brandKit: true, videoSave: true, aiPolishPerMonth: 300,
  },
  pass: {
    id: "pass", name: "Deck Pass", priceLabel: "$12 once · 7 days",
    decksPerPeriod: 5, period: "pass", exports: ["png", "pdf", "flipbook"],
    forms: 4, watermark: false, brandKit: true, videoSave: true, aiPolishPerMonth: 0,
  },
};
