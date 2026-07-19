export interface Exercise {
  id: string
  /** 繁體中文名稱 */
  name: string
  /** 英文原名 */
  nameEn: string
  category: string
  categoryZh: string
  equipment: string
  equipmentZh: string
  target: string
  targetZh: string
  /** 次要肌群（繁中） */
  secondary: string[]
  /** 分步驟教學（繁中） */
  steps: string[]
  image: string
  gif: string
}
