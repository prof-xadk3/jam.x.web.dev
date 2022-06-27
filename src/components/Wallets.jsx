import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as rb from 'react-bootstrap'
import Sprite from './Sprite'
import Alert from './Alert'
import Wallet from './Wallet'
import PageTitle from './PageTitle'
import { useSettings, useSettingsDispatch } from '../context/SettingsContext'
import { useCurrentWallet } from '../context/WalletContext'
import { useServiceInfo, useReloadServiceInfo } from '../context/ServiceInfoContext'
import { useTranslation } from 'react-i18next'
import { walletDisplayName } from '../utils'
import * as Api from '../libs/JmWalletApi'
import { routes } from '../constants/routes'
import styles from './Wallets.module.css'

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

export default function Wallets({ startWallet, stopWallet, show = true, onHide = () => {} }) {
  const { t } = useTranslation()
  const currentWallet = useCurrentWallet()
  const serviceInfo = useServiceInfo()
  const reloadServiceInfo = useReloadServiceInfo()
  const settings = useSettings()
  const settingsDispatch = useSettingsDispatch()
  const [walletList, setWalletList] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [alert, setAlert] = useState(null)

  useEffect(() => {
    if (walletList && serviceInfo) {
      const sortedWalletList = sortWallets(walletList, serviceInfo.walletName)
      if (!arrayEquals(walletList, sortedWalletList)) {
        setWalletList(sortedWalletList)
      }
    }
  }, [serviceInfo, walletList])

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
    <rb.Offcanvas className={styles['offcanvas']} show={show} onHide={onHide} placement="bottom">
      <rb.Offcanvas.Header className={styles['offcanvas-header']}>
        <rb.Button variant="link" className="unstyled ps-0" onClick={() => onHide()}>
          <span>{t('global.close')}</span>
        </rb.Button>
      </rb.Offcanvas.Header>
      <rb.Offcanvas.Body>
        <rb.Container className="py-4 py-sm-5">
          <rb.Row className="justify-content-center">
            <rb.Col md={10} lg={8} xl={6}>
              <PageTitle
                title={t('wallets.title')}
                subtitle={walletList?.length === 0 ? t('wallets.subtitle_no_wallets') : null}
                center={true}
              />
              {alert && <Alert {...alert} />}
              {isLoading ? (
                <div className="d-flex justify-content-center align-items-center">
                  <rb.Spinner
                    as="span"
                    animation="border"
                    size="sm"
                    role="status"
                    aria-hidden="true"
                    className="me-2"
                  />
                  <span>{t('wallets.text_loading')}</span>
                </div>
              ) : (
                <div>
                  <div className="d-flex flex-1 align-items-center gap-3">
                    <div>Default</div>
                    <div className={styles['border-top']}></div>
                  </div>
                  {walletList?.map((wallet, index) => (
                    <Wallet
                      key={wallet}
                      name={wallet}
                      noneActive={!serviceInfo?.walletName}
                      isActive={serviceInfo?.walletName === wallet}
                      hasToken={currentWallet && currentWallet.token && currentWallet.name === serviceInfo?.walletName}
                      makerRunning={serviceInfo?.makerRunning}
                      coinjoinInProgress={serviceInfo?.coinjoinInProgress}
                      currentWallet={currentWallet}
                      startWallet={startWallet}
                      stopWallet={stopWallet}
                      setAlert={setAlert}
                      isSelected={settings.defaultWallet !== undefined && settings.defaultWallet === wallet}
                      onSelected={() => settingsDispatch({ defaultWallet: wallet })}
                      className={`bg-transparent rounded-0 border-start-0 border-end-0 border-top-0`}
                    />
                  ))}
                </div>
              )}
              <div className="d-flex justify-content-center">
                <Link
                  to={routes.createWallet}
                  className={`btn px-4 mt-4 ${walletList?.length === 0 ? 'btn-lg btn-dark' : 'btn-outline-dark'}`}
                  data-testid="new-wallet-btn"
                >
                  <div className="d-flex justify-content-center align-items-center">
                    <Sprite symbol="plus" width="24" height="24" className="me-2" />
                    <span>{t('wallets.button_new_wallet')}</span>
                  </div>
                </Link>
              </div>
            </rb.Col>
          </rb.Row>
        </rb.Container>
      </rb.Offcanvas.Body>
    </rb.Offcanvas>
  )
}
