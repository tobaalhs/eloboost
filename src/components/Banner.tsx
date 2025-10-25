import { useTranslation } from "react-i18next";
import "./Banner.css";

const Banner: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="banner">
      <h1>
        {t('banner.title')} <span className="highlight">{t('banner.highlight')}</span>
      </h1>
      <p>{t('banner.subtitle')}</p>
    </div>
  );
};

export default Banner;