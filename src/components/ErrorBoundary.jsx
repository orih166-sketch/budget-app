import { Component } from 'react'
import styles from './ErrorBoundary.module.css'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className={styles.wrap}>
          <div className={styles.card}>
            <h3 className={styles.title}>⚠️ שגיאה</h3>
            <p className={styles.msg}>משהו השתבש בעמוד זה</p>
            <button 
              className={styles.btn}
              onClick={() => this.setState({ hasError: false, error: null })}
            >
              נסה שוב
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
