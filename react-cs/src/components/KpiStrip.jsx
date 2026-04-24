import { useTranslation } from "react-i18next";
import { fmt } from "../utils/index.js";

export function KpiStrip({
  totalBuy,
  totalMarket,
  profit,
  pct,
  totalPts,
  activeCount,
  accentCol,
  redCol
}) {
  const { t } = useTranslation();

  return (
    <div className="kpi-strip">

      {/* Investi */}
      <div className="kpi-cell">
        <div className="kpi-cell-label">{t("kpi.invested")}</div>
        <div className="kpi-cell-val">{fmt(totalBuy)} €</div>
        <div className="kpi-cell-sub">
          {activeCount} {activeCount !== 1 ? t("kpi.skins") : t("kpi.skin")}
        </div>
      </div>

      {/* Valeur marché */}
      <div className="kpi-cell">
        <div className="kpi-cell-label">{t("kpi.marketValue")}</div>
        <div className="kpi-cell-val">{fmt(totalMarket)} €</div>
        <div className="kpi-cell-sub">{t("kpi.steamLowest")}</div>
      </div>

      {/* Profit / Perte */}
      <div className="kpi-cell">
        <div className="kpi-cell-label">{t("kpi.profitLoss")}</div>
        <div
          className="kpi-cell-val"
          style={{ color: profit >= 0 ? accentCol : redCol }}
        >
          {profit >= 0 ? "+" : ""}
          {fmt(profit)} €
        </div>
        <div className="kpi-cell-sub">
          {pct >= 0 ? "+" : ""}{fmt(pct, 1)} % {t("kpi.sinceAchat")}
        </div>
        <div className="kpi-cell-sub" style={{ opacity:0.55 }}>
          {t("kpi.basedOnLowest")}
        </div>
      </div>

      {/* Points de données */}
      <div className="kpi-cell">
        <div className="kpi-cell-label">{t("kpi.dataPoints")}</div>
        <div className="kpi-cell-val">{totalPts}</div>
        <div className="kpi-cell-sub">{t("kpi.timelineSteam")}</div>
      </div>

    </div>
  );
}