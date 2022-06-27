import React, { useEffect, useState, useCallback } from 'react'
import * as rb from 'react-bootstrap'
import { useNavigate } from 'react-router-dom'
import Sprite from './Sprite'
import { Formik } from 'formik'
import { useCurrentWallet } from '../context/WalletContext'
import { useServiceInfo, useReloadServiceInfo } from '../context/ServiceInfoContext'
import { useSettings, useSettingsDispatch } from '../context/SettingsContext'
import { useTranslation } from 'react-i18next'
import { walletDisplayName } from '../utils'
import * as Api from '../libs/JmWalletApi'
import { routes } from '../constants/routes'
import styles from './UnlockWallet.module.css'

function arrayEquals(a, b) {
  return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((val, index) => val === b[index])
}

function sortWallets(wallets, activeWalletName = null) {
  if (activeWalletName && wallets.indexOf(activeWalletName) >= 0) {
    return [activeWalletName, ...sortWallets(wallets.filter((a) => a !== activeWalletName))]
  } else {
    return [...wallets].sort((a, b) => a.localeCompare(b))
  }
}

const WalletUnlockForm = ({ walletName, unlockWallet, isLoading }) => {
  const { t } = useTranslation()

  const initialValues = {
    password: '',
  }

  const validate = (values) => {
    const errors = {}
    if (!values.password) {
      errors.password = t('wallets.wallet_preview.feedback_missing_password')
    }
    return errors
  }

  const onSubmit = useCallback(
    async (values) => {
      await unlockWallet(walletName, values.password)
    },
    [walletName, unlockWallet]
  )

  return (
    <Formik initialValues={initialValues} validate={validate} onSubmit={onSubmit} validateOnBlur={false}>
      {({ handleSubmit, handleChange, handleBlur, values, touched, errors, isSubmitting }) => (
        <rb.Form onSubmit={handleSubmit} noValidate className={styles.passwordForm}>
          {isLoading ? (
            <rb.Placeholder as="div" animation="wave">
              <rb.Placeholder data-testid="balance-component-placeholder" className={styles.walletNamePlaceholder} />
            </rb.Placeholder>
          ) : (
            <div className={styles.walletName}>{walletName}</div>
          )}
          <rb.InputGroup hasValidation={true} className="d-flex flex-column gap-3">
            {isLoading ? (
              <rb.Placeholder as="div" animation="wave">
                <rb.Placeholder
                  data-testid="balance-component-placeholder"
                  className={styles['balance-component-placeholder']}
                />
              </rb.Placeholder>
            ) : (
              <rb.Form.Control
                className={styles.passwordInput}
                name="password"
                type="password"
                placeholder={t('wallets.wallet_preview.placeholder_password')}
                disabled={isSubmitting}
                onChange={handleChange}
                onBlur={handleBlur}
                value={values.password}
                isInvalid={touched.password && errors.password}
              />
            )}
            <rb.Button
              variant="dark"
              className={styles.submitButton}
              type="submit"
              disabled={isSubmitting || isLoading}
            >
              {isSubmitting ? (
                <div className="d-flex justify-content-center align-items-center">
                  <rb.Spinner
                    as="span"
                    animation="border"
                    size="sm"
                    role="status"
                    aria-hidden="true"
                    className="me-2"
                  />
                  {t('wallets.wallet_preview.button_unlocking')}
                </div>
              ) : (
                <div className="d-flex justify-content-center align-items-center">
                  <Sprite symbol="unlock" width="24px" height="24px" />
                  {t('wallets.wallet_preview.button_unlock')}
                </div>
              )}
            </rb.Button>
          </rb.InputGroup>
        </rb.Form>
      )}
    </Formik>
  )
}

export default function Wallets({ startWallet, stopWallet, show = true, onHide = () => {} }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const currentWallet = useCurrentWallet()
  const serviceInfo = useServiceInfo()
  const reloadServiceInfo = useReloadServiceInfo()
  const settings = useSettings()
  const settingsDispatch = useSettingsDispatch()
  const [walletList, setWalletList] = useState(null)
  const [defaultWallet, setDefaultWallet] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [alert, setAlert] = useState(null)

  const unlockWallet = useCallback(
    async (walletName, password) => {
      try {
        const res = await Api.postWalletUnlock({ walletName }, { password })
        const body = await (res.ok ? res.json() : Api.Helper.throwError(res))

        const { walletname: unlockedWalletName, token } = body
        startWallet(unlockedWalletName, token)
        navigate(routes.wallet)
      } catch (e) {
        const message = e.message.replace('Wallet', walletName)
        setAlert({ variant: 'danger', dismissible: false, message })
      }
    },
    [setAlert, startWallet, navigate]
  )

  useEffect(() => {
    if (walletList && serviceInfo) {
      const sortedWalletList = sortWallets(walletList, serviceInfo.walletName)
      if (!arrayEquals(walletList, sortedWalletList)) {
        setWalletList(sortedWalletList)
      }
    }
  }, [serviceInfo, walletList])

  useEffect(() => {
    if (!walletList || walletList.length === 0) return
    if (settings.defaultWallet !== undefined) return

    if (serviceInfo && serviceInfo.walletName) {
      settingsDispatch({ defaultWallet: serviceInfo.walletName })
    } else {
      settingsDispatch({ defaultWallet: walletList[0] })
    }
  }, [serviceInfo, walletList, settings.defaultWallet, settingsDispatch])

  useEffect(() => {
    setDefaultWallet(settings.defaultWallet)
  }, [settings.defaultWallet])

  useEffect(() => {
    const abortCtrl = new AbortController()

    setIsLoading(true)
    const loadingServiceInfo = reloadServiceInfo({ signal: abortCtrl.signal })

    const loadingWallets = Api.getWalletAll({ signal: abortCtrl.signal })
      .then((res) => (res.ok ? res.json() : Api.Helper.throwError(res, t('wallets.error_loading_failed'))))
      .then((data) => sortWallets(data.wallets || [], currentWallet?.name))
      .then((sortedWalletList) => {
        if (abortCtrl.signal.aborted) return

        setWalletList(sortedWalletList)

        if (currentWallet && sortedWalletList.length > 1) {
          setAlert({
            variant: 'info',
            message: t('wallets.alert_wallet_open', { currentWalletName: walletDisplayName(currentWallet.name) }),
            dismissible: true,
          })
        }
      })

    Promise.all([loadingServiceInfo, loadingWallets])
      .catch((err) => {
        const message = err.message || t('wallets.error_loading_failed')
        !abortCtrl.signal.aborted && setAlert({ variant: 'danger', message })
      })
      .finally(() => !abortCtrl.signal.aborted && setIsLoading(false))

    return () => abortCtrl.abort()
  }, [currentWallet, reloadServiceInfo, t])

  return (
    <rb.Container className={styles.unlockContainer}>
      <rb.Row>
        <rb.Col>
          <div className="d-flex flex-column align-items-center gap-3">
            <Sprite symbol="logo" width="100px" height="100px" />
            <h1 className="">{t('onboarding.splashscreen_title')}</h1>
          </div>
        </rb.Col>
      </rb.Row>
      <rb.Row className="mt-5 mb-3 justify-content-center">
        <rb.Col>
          <div className="d-flex flex-column align-items-center gap-2">
            <h2 className="text-center">Welcome back!</h2>
            <div className="mb-2 text-center">Enter the wallet password for your default wallet.</div>
          </div>
        </rb.Col>
      </rb.Row>
      <rb.Row className="d-flex justify-content-center">
        <rb.Col xs={12} md={8}>
          <WalletUnlockForm walletName={defaultWallet} unlockWallet={unlockWallet} isLoading={isLoading} />
        </rb.Col>
      </rb.Row>
    </rb.Container>
  )
}
