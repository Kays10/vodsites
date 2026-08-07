export interface Site {
  id: string;
  name: string;
  group: string;
  services: string[];
  vpn: string;
  pms: string;
  hsia: string;
  ip: string;
  iptvSystem: string;
  iptvUrl: string;
  castingUrl: string;
  headend: string;
  headendUrl: string;
  switches: string;
  wlanController: string;
  wlanControllerUrl: string;
  notes: string;
  other: string;
}

export interface AuthUser {
  id: string;
  email: string;
  fullName: string | null;
}

export interface ManagedUser {
  id: string;
  email: string;
  fullName: string | null;
  isActive: boolean;
  createdAt: string | null;
}

