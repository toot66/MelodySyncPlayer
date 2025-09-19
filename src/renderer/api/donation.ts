import axios from 'axios';

export interface Donor {
  id: number;
  name: string;
  amount: number;
  date: string;
  message?: string;
  avatar?: string;
  badge: string;
  badgeColor: string;
}

/**
 * 获取捐赠列表
 */
export const getDonationList = async (): Promise<Donor[]> => {
  const base = (import.meta as any)?.env?.VITE_DONATION_API as string | undefined;
  if (!base) {
    // 未配置新接口时，返回空列表，避免依赖旧域名
    return [];
  }
  const url = `${base.replace(/\/$/, '')}/donations`;
  const { data } = await axios.get(url);
  return data;
};
