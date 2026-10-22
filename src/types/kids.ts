export type KidDeviceStatus = 'pending_approval' | 'active' | 'revoked';

export interface KidDevice {
  id: string;
  deviceName: string;
  status: KidDeviceStatus;
  isActive: boolean;
  createdAt: string;
  lastActiveAt?: string;
  approvedAt?: string;
  revokedAt?: string;
  failedPinAttempts: number;
  isLocked: boolean;
}

export interface KidDeviceInviteDetails {
  childId: string;
  childName: string;
  avatarColor: string;
  avatarEmoji: string;
  familyName: string;
  deviceNameHint?: string;
}

export interface KidRedemptionRequest {
  id: string;
  rewardId: string;
  rewardTitle: string;
  childId: string;
  childName?: string;
  pointsCost: number;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
}

export interface PendingKidTaskApproval {
  id: string;
  title: string;
  description?: string;
  assignedTo: string;
  completedBy?: string;
  childName: string;
  pointsReward: number;
  dueDate?: string;
  updatedAt: string;
}

export interface PendingApprovalsState {
  pendingTasks: PendingKidTaskApproval[];
  pendingRedemptions: KidRedemptionRequest[];
  pendingDevices: {
    id: string;
    deviceName: string;
    childId: string;
    childName: string;
    createdAt: string;
  }[];
  totalCount: number;
}

export interface KidDashboardData {
  child: {
    id: string;
    name: string;
    points: number;
    avatarColor: string;
    avatarEmoji: string;
    familyName: string;
  };
  tasks: Array<{
    id: string;
    title: string;
    description?: string;
    priority: string;
    status: string;
    pointsReward: number;
    dueDate?: string;
    categoryKey: string;
    isPendingApproval: boolean;
    isCompleted: boolean;
  }>;
  habits: Array<{
    id: string;
    title: string;
    icon: string;
    color: string;
    frequency: string;
    points: number;
    completedDates: string[];
    active: boolean;
  }>;
  pointsHistory: Array<{
    id: string;
    points: number;
    reason: string;
    date: string;
  }>;
  rewards: Array<{
    id: string;
    title: string;
    description: string;
    pointsCost: number;
    category: string;
    icon: string;
  }>;
  redemptions: KidRedemptionRequest[];
  calendar: Array<{
    id: string;
    title: string;
    description?: string;
    date: string;
    time?: string;
    category: string;
    color: string;
  }>;
}

export interface KidLocalDeviceAuth {
  deviceId: string;
  deviceTokenSecret: string;
  childId: string;
  childName: string;
  avatarEmoji: string;
  avatarColor: string;
  familyName: string;
}
