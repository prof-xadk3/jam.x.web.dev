import React, { useState, useEffect } from 'react'
import * as rb from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
// @ts-ignore
import DisplayAccounts from './DisplayAccounts'
// @ts-ignore
import DisplayAccountUTXOs from './DisplayAccountUTXOs'
// @ts-ignore
import DisplayUTXOs from './DisplayUTXOs'
// @ts-ignore
import { useCurrentWallet, useCurrentWalletInfo, useSetCurrentWalletInfo } from '../context/WalletContext'
import * as Api from '../libs/JmWalletApi'

type Utxos = any[]
type Alert = { message: string; variant: string }

export default function CurrentWalletAdvanced() {
  const { t } = useTranslation()
  const currentWallet = useCurrentWallet()
  const walletInfo = useCurrentWalletInfo()
  const setWalletInfo = useSetCurrentWalletInfo()
  const [fidelityBonds, setFidelityBonds] = useState<Utxos | null>(null)
  const [utxos, setUtxos] = useState<Utxos | null>(null)
  const [showUTXO, setShowUTXO] = useState(false)
  const [alert, setAlert] = useState<Alert | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!currentWallet) {
      setAlert({ variant: 'danger', message: t('current_wallet.error_loading_failed') })
      setIsLoading(false)
      return
    }

    const abortCtrl = new AbortController()
    const { name: walletName, token } = currentWallet

    const setUtxoData = (utxos: Utxos) => {
      setUtxos(utxos)
      setFidelityBonds(utxos.filter((utxo) => utxo.locktime))
    }

    setAlert(null)
    setIsLoading(true)

    const loadingWallet = Api.getWalletDisplay({ walletName, token, signal: abortCtrl.signal })
      .then((res) => (res.ok ? res.json() : Api.Helper.throwError(res, t('current_wallet.error_loading_failed'))))
      .then((data) => setWalletInfo(data.walletinfo))
      .catch((err) => {
        !abortCtrl.signal.aborted && setAlert({ variant: 'danger', message: err.message })
      })

    const loadingUtxos = Api.getWalletUtxos({ walletName, token, signal: abortCtrl.signal })
      .then(
        (res): Promise<{ utxos: Utxos }> =>
          res.ok ? res.json() : Api.Helper.throwError(res, t('current_wallet_advanced.error_loading_utxos_failed'))
      )
      .then((data) => setUtxoData(data.utxos))
      .catch((err) => {
        !abortCtrl.signal.aborted && setAlert({ variant: 'danger', message: err.message })
      })

    Promise.all([loadingWallet, loadingUtxos]).finally(() => !abortCtrl.signal.aborted && setIsLoading(false))

    return () => abortCtrl.abort()
  }, [currentWallet, setWalletInfo, t])

  const startTumbler = async () => {
    await startTumblerService()
  }

  const stopTumbler = async () => {
    await stopTumblerService()
  }

  const getSchedule = async () => {
    await getTumblerSchedule()
  }

  const startTumblerService = async () => {
    const { name: walletName, token } = currentWallet

    const externalEntries = walletInfo.accounts[4].branches[0].entries
    const destination = externalEntries.find((entry: any) => entry.status === 'new').address

    var destinations: string[] = [] as string[]

    externalEntries.every((entry: any) => {
      if (entry.status === 'new') {
        destinations.push(entry.address)
      }

      if (destinations.length >= 3) {
        return false
      }

      return true
    })

    try {
      const res = await Api.postTumblerStart(
        { walletName, token },
        {
          destination_addresses: destinations,
        }
      )

      if (res.ok) {
        const data = await res.json()
        console.log(data)
      }
    } catch (e: any) {
      console.log(e.message)
    }
  }

  const stopTumblerService = async () => {
    const { name: walletName, token } = currentWallet

    try {
      const res = await Api.getTumblerStop({ walletName, token })

      if (res.ok) {
        const data = await res.json()
        console.log(data)
      }
    } catch (e: any) {
      console.log(e.message)
    }
  }

  const getTumblerSchedule = async () => {
    const { name: walletName, token } = currentWallet

    try {
      const res = await Api.getTumblerSchedule({ walletName, token })

      if (res.ok) {
        const data = await res.json()
        console.log(data)
      }
    } catch (e: any) {
      console.log(e.message)
    }
  }

  return (
    <div>
      {alert && <rb.Alert variant={alert.variant}>{alert.message}</rb.Alert>}
      {isLoading && (
        <rb.Row className="justify-content-center">
          <rb.Col className="flex-grow-0">
            <div className="d-flex mb-3">
              <rb.Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
              {t('current_wallet.text_loading')}
            </div>
          </rb.Col>
        </rb.Row>
      )}
      {!isLoading && walletInfo && <DisplayAccounts accounts={walletInfo.accounts} className="mb-4" />}
      {!!fidelityBonds?.length && (
        <div className="mt-5 mb-3 pe-3">
          <h5>{t('current_wallet_advanced.title_fidelity_bonds')}</h5>
          <DisplayUTXOs utxos={fidelityBonds} className="pe-2" />
        </div>
      )}
      {utxos && (
        <>
          <rb.Button
            variant="outline-dark"
            onClick={() => {
              setShowUTXO(!showUTXO)
            }}
            className="mb-3"
          >
            {showUTXO ? t('current_wallet_advanced.button_hide_utxos') : t('current_wallet_advanced.button_show_utxos')}
          </rb.Button>
          <rb.Fade in={showUTXO} mountOnEnter={true} unmountOnExit={true}>
            <div>
              {utxos.length === 0 ? (
                <rb.Alert variant="info">{t('current_wallet_advanced.alert_no_utxos')}</rb.Alert>
              ) : (
                <DisplayAccountUTXOs utxos={utxos} className="mt-3" />
              )}
            </div>
          </rb.Fade>
        </>
      )}
      {!isLoading && walletInfo && (
        <div className="mb-3">
          <rb.Button variant="outline-dark" onClick={startTumbler} className="mb-3">
            Start Tumbler
          </rb.Button>
          <rb.Button variant="outline-dark" onClick={stopTumbler} className="mb-3">
            Stop Tumbler
          </rb.Button>
          <rb.Button variant="outline-dark" onClick={getSchedule} className="mb-3">
            Get Tumbler Progress
          </rb.Button>
        </div>
      )}
    </div>
  )
}
