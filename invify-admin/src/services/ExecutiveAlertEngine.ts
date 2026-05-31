// invify-admin/src/services/ExecutiveAlertEngine.ts

export interface ExecutiveAlert {
  id: string;
  type: 'FRAUD' | 'TREASURY' | 'COMPLIANCE' | 'SYSTEM';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  message: string;
  timestamp: string;
  link?: string;
  read: boolean;
}

class AlertEngine {
  private alerts: ExecutiveAlert[] = [];
  private listeners: Function[] = [];

  constructor() {
    this.seedMockAlerts();
    this.startMockEngine();
  }

  private seedMockAlerts() {
    this.alerts = [
      {
        id: 'ALT-1',
        type: 'FRAUD',
        severity: 'CRITICAL',
        title: 'Velocity Anomaly Detected',
        message: 'Agent Network SW cluster exhibiting suspicious velocity. 42 Terminals affected.',
        timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
        link: '/finance/fraud',
        read: false
      },
      {
        id: 'ALT-2',
        type: 'TREASURY',
        severity: 'HIGH',
        title: 'Liquidity Pressure Warning',
        message: 'Settlement queue approaching max threshold for GTB Partner.',
        timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
        link: '/finance/settlements',
        read: false
      }
    ];
  }

  private startMockEngine() {
    // Simulate real-time alerts
    setInterval(() => {
      const newAlert: ExecutiveAlert = {
        id: `ALT-${Date.now()}`,
        type: 'COMPLIANCE',
        severity: 'MEDIUM',
        title: 'KYC Expiration Approaching',
        message: '3 High-value merchants have KYC expiring in < 48hrs.',
        timestamp: new Date().toISOString(),
        link: '/finance/compliance',
        read: false
      };
      this.alerts.unshift(newAlert);
      this.notify();
    }, 60000); // Every 60s
  }

  public subscribe(listener: Function) {
    this.listeners.push(listener);
    listener(this.alerts);
  }

  public unsubscribe(listener: Function) {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  private notify() {
    this.listeners.forEach(l => l(this.alerts));
  }

  public getAlerts() {
    return this.alerts;
  }

  public getUnreadCount() {
    return this.alerts.filter(a => !a.read).length;
  }

  public markAsRead(id: string) {
    const alert = this.alerts.find(a => a.id === id);
    if (alert) {
      alert.read = true;
      this.notify();
    }
  }

  public markAllAsRead() {
    this.alerts.forEach(a => a.read = true);
    this.notify();
  }
}

export const ExecutiveAlertEngine = new AlertEngine();
