import React from 'react'
import { useState, useEffect } from 'react'
import * as rb from 'react-bootstrap'
import DisplayAccounts from './DisplayAccounts'
import DisplayAccountUTXOs from './DisplayAccountUTXOs'
import { walletDisplayName } from '../utils'
import DisplayUTXOs from './DisplayUTXOs'
import Balance from './Balance'
import { useSettings } from '../context/SettingsContext'

export default function CurrentWallet({ currentWallet }) {
  const [walletInfo, setWalletInfo] = useState(null)
  const [fidelityBonds, setFidelityBonds] = useState(null)
  const [utxos, setUtxos] = useState(null)
  const [showUTXO, setShowUTXO] = useState(false)
  const [alert, setAlert] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const settings = useSettings()

  useEffect(() => {
    const abortCtrl = new AbortController()
    const { name, token } = currentWallet
    const opts = {
      headers: { Authorization: `Bearer ${token}` },
      signal: abortCtrl.signal,
    }

    const setUtxoData = (utxos) => {
      setUtxos(utxos)
      setFidelityBonds(utxos.filter((utxo) => utxo.locktime))
    }

    setAlert(null)
    setIsLoading(true)

    const loadingWallet = fetch(`/api/v1/wallet/${name}/display`, opts)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(res.message || 'Loading wallet failed.'))))
      .then((data) => setWalletInfo(data.walletinfo))
      .catch((err) => {
        !abortCtrl.signal.aborted && setAlert({ variant: 'danger', message: err.message })
      })

    const loadingUtxos = fetch(`/api/v1/wallet/${name}/utxos`, opts)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(res.message || 'Loading UTXOs failed.'))))
      .then((data) => setUtxoData(data.utxos))
      .catch((err) => {
        !abortCtrl.signal.aborted && setAlert({ variant: 'danger', message: err.message })
      })

    Promise.all([loadingWallet, loadingUtxos]).finally(() => setIsLoading(false))

    return () => abortCtrl.abort()
  }, [currentWallet])

  return (
    <div>
      <h1>{walletDisplayName(currentWallet.name)}</h1>
      {alert && <rb.Alert variant={alert.variant}>{alert.message}</rb.Alert>}
      {isLoading && (
        <div className="mb-3">
          <rb.Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
          Loading
        </div>
      )}
      {walletInfo && walletInfo?.total_balance && (
        <p>
          Total balance:{' '}
          <Balance value={walletInfo.total_balance} unit={settings.unit} showBalance={settings.showBalance} />
        </p>
      )}
      {walletInfo && <DisplayAccounts accounts={walletInfo.accounts} className="mb-4" />}
      {!!fidelityBonds?.length && (
        <div className="mt-5 mb-3 pe-3">
          <h5>Fidelity Bonds</h5>
          <DisplayUTXOs utxos={fidelityBonds} className="pe-2" />
        </div>
      )}
      {utxos && (
        <rb.Button
          variant="outline-dark"
          onClick={() => {
            setShowUTXO(!showUTXO)
          }}
          className="mb-3"
        >
          {showUTXO ? 'Hide UTXOs' : 'Show UTXOs'}
        </rb.Button>
      )}
      {utxos && showUTXO && <DisplayAccountUTXOs utxos={utxos} className="mt-3" />}
    </div>
  )
}