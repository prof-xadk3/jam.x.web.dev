interface Schedule {
  items: ScheduleItem[]
}

interface ScheduleItem {
  sourceMixdepth: number
  amount: number
  counterparties: number
  destination: string
  waittime: number
  rounding: number
  completed: boolean
}

class ScheduleParser {
  rawSchedule: any[]

  constructor(rawSchedule: any) {
    this.rawSchedule = rawSchedule as any[]
  }

  parse(): Schedule {
    const items = this.rawSchedule.map((rawItem) => {
      return {
        sourceMixdepth: rawItem[0],
        amount: rawItem[1],
        counterparties: rawItem[2],
        destination: rawItem[3],
        waittime: rawItem[4],
        rounding: rawItem[5],
        completed: rawItem[6] === 1 ? true : false,
        unconfirmed_txid: rawItem[6] !== 0 && rawItem[6] !== 1 ? rawItem[6] : null,
      }
    })

    return { items: items }
  }
}

export default ScheduleParser
