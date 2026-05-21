import { Component } from 'react'

export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info)
  }

  reset = () => { this.setState({ error: null }) }
  reload = () => { window.location.reload() }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-4">
        <div role="alert" className="bg-surface border border-danger p-6 max-w-md w-full space-y-4 glow-danger">
          <p className="font-display text-[10px] uppercase tracking-[0.4em] text-danger">ERR · Excepción</p>
          <h1 className="font-display text-2xl font-bold text-text-hi">Algo falló</h1>
          <p className="text-text-mid text-sm">
            Tus datos están a salvo en este dispositivo. Reintenta o recarga la app.
          </p>
          <pre className="text-xs text-text-lo bg-bg border border-border p-2 overflow-x-auto font-mono">
            {String(this.state.error?.message ?? this.state.error)}
          </pre>
          <div className="flex gap-3">
            <button
              onClick={this.reset}
              className="flex-1 bg-bg border border-border-hi hover:border-text-hi text-text-mid hover:text-text-hi font-display uppercase tracking-widest text-xs py-3 transition-colors"
            >
              Reintentar
            </button>
            <button
              onClick={this.reload}
              className="flex-1 bg-surface border border-activa text-activa hover:glow-activa font-display uppercase tracking-widest text-xs py-3 transition-shadow"
            >
              Recargar app
            </button>
          </div>
        </div>
      </div>
    )
  }
}
