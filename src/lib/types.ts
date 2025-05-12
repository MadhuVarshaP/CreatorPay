export interface Creator {
    address: string
    name: string
    subscriptionFee: number
    platformShare: number
  }
  
  export interface CreatorDashboard {
    address: string
    subscriptionFee: number
    platformShare: number
    totalEarnings: number
    subscribers: number
  }
  