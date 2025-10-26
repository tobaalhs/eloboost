"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { Link, useSearchParams, useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import "./PaymentResult.css"

const PaymentSuccess: React.FC = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [showConfetti, setShowConfetti] = useState(true)

  const flowOrder = searchParams.get("flowOrder")

  useEffect(() => {
    console.log(`Pago exitoso confirmado en el frontend. Flow Order: ${flowOrder}`)
    localStorage.removeItem("pendingBoostOrder")

    const timer = setTimeout(() => {
      setShowConfetti(false)
    }, 4000)

    return () => clearTimeout(timer)
  }, [flowOrder])

  const generateConfetti = () => {
    const particles = []
    const colors = ["#FFD700", "#FFA500", "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4"]

    for (let i = 0; i < 50; i++) {
      particles.push({
        id: i,
        left: Math.random() * 100,
        animationDelay: Math.random() * 0.5,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 10 + 5,
        rotation: Math.random() * 360,
      })
    }
    return particles
  }

  const confettiParticles = generateConfetti()

  return (
    <div className="payment-result-container">
      {showConfetti && (
        <div className="confetti-container">
          {confettiParticles.map((particle) => (
            <div
              key={particle.id}
              className="confetti-piece"
              style={{
                left: `${particle.left}%`,
                animationDelay: `${particle.animationDelay}s`,
                backgroundColor: particle.color,
                width: `${particle.size}px`,
                height: `${particle.size}px`,
                transform: `rotate(${particle.rotation}deg)`,
              }}
            />
          ))}
        </div>
      )}

      <div className="payment-success-card">
        <div className="success-icon-wrapper">
          <svg className="success-checkmark" viewBox="0 0 52 52">
            <circle className="success-checkmark-circle" cx="26" cy="26" r="25" fill="none" />
            <path className="success-checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
          </svg>
        </div>

        <h1 className="success-title">{t("payment.success.title")}</h1>
        <p className="success-message">{t("payment.success.message")}</p>

        {flowOrder && (
          <div className="order-info-box">
            <span className="order-label">{t("payment.success.orderId")}:</span>
            <span className="order-id">{flowOrder}</span>
          </div>
        )}

        <div className="info-sections">
          <div className="info-card">
            <div className="info-icon email-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h3>{t("payment.success.emailSent")}</h3>
            <p>{t("payment.success.emailDescription")}</p>
          </div>

          <div className="info-card">
            <div className="info-icon rocket-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <h3>{t("payment.success.serviceStarting")}</h3>
            <p>{t("payment.success.serviceDescription")}</p>
          </div>

          <div className="info-card">
            <div className="info-icon chart-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
              </svg>
            </div>
            <h3>{t("payment.success.trackProgress")}</h3>
            <p>{t("payment.success.trackDescription")}</p>
          </div>
        </div>

        <div className="action-buttons">
          <button className="primary-button" onClick={() => navigate("/dashboard")}>
            {t("payment.success.viewService")}
          </button>
          <Link to="/" className="secondary-button">
            {t("payment.success.backToHome")}
          </Link>
        </div>

        <div className="support-link">
          <p>
            {t("payment.success.needHelp")} <a href="/support">{t("payment.success.contactSupport")}</a>
          </p>
        </div>
      </div>
    </div>
  )
}

export default PaymentSuccess
