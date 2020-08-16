import dayjs from 'dayjs'

export const state = () => ({
  eventList: [],
  schedule: [],
  currentBlockIndex: 0,
  maxScheduleEntries: 5,
  scheduleIndexCounter: 0
})

export const ScheduleItemType = {
  WORK: 'work',
  SHORTPAUSE: 'shortpause',
  LONGPAUSE: 'longpause',
  WAIT: 'wait',
  OTHER: 'other'
}

export class ScheduleEntry {
  constructor (length, index, type = ScheduleItemType.WORK) {
    this._type = type
    this._length = length
    this._index = index
  }
}

export class UserEvent {
  constructor (timestamp = dayjs(), eventType = UserEventType.OTHER) {
    this._timestamp = timestamp
    this._eventType = eventType
  }
}

export const UserEventType = {
  FOCUS_GAIN: 'focus.gain',
  FOCUS_LOST: 'focus.lost',
  TIMER_START: 'timer.start',
  TIMER_PAUSE: 'timer.pause',
  TIMER_STOP: 'timer.stop',
  TIMER_FINISH: 'timer.complete',
  SCHEDULE_ADVANCE_MANUAL: 'schedule.advmanual',
  SCHEDULE_ADVANCE_AUTO: 'schedule.advauto',
  OTHER: 'other'
}

export const getters = {
  nextScheduleColour (state, getters, rootState) {
    const currentState = state.schedule[1] ? state.schedule[1]._type : null
    if (currentState) {
      return rootState.settings.visuals[currentState].colour
    } else {
      return ''
    }
  },

  currentScheduleEntry (state) {
    if (state.schedule.length > 0) {
      return state.schedule[0]
    } else {
      return null
    }
  },

  currentScheduleColour (state, getters, rootState) {
    return rootState.settings.visuals[state.schedule[0] ? state.schedule[0]._type : 'wait'].colour
  }
}

export const mutations = {
  insertNextScheduleEntry (state, { lengths, longPauseInterval }) {
    const numEntriesInABlock = 2 * (longPauseInterval)

    // we add 900 to the lengths to make sure the timer does not start by "subtracting 2 seconds"
    // at the very first tick: it's a bit more than 1000ms that gets subtracted

    if (state.currentBlockIndex === numEntriesInABlock - 1) {
      state.schedule.push(new ScheduleEntry(lengths.longpause + 900, state.scheduleIndexCounter++, ScheduleItemType.LONGPAUSE))
    } else if (state.currentBlockIndex % 2) {
      state.schedule.push(new ScheduleEntry(lengths.shortpause + 900, state.scheduleIndexCounter++, ScheduleItemType.SHORTPAUSE))
    } else {
      state.schedule.push(new ScheduleEntry(lengths.work + 900, state.scheduleIndexCounter++, ScheduleItemType.WORK))
    }
    state.currentBlockIndex = (state.currentBlockIndex + 1) % numEntriesInABlock
  },

  completeScheduleEntry (state) {
    state.schedule = state.schedule.slice(1)
  },

  recordUserEvent (state, eventType = UserEventType.OTHER) {
    state.eventList.push(new UserEvent(dayjs(), eventType))
  }
}

export const actions = {
  checkSchedule ({ state, commit, rootState }) {
    const settingsToUse = rootState.settings.schedule
    while (state.schedule.length < state.maxScheduleEntries) {
      commit('insertNextScheduleEntry', settingsToUse)
    }
  },

  advanceSchedule ({ commit, dispatch, state }, { isAutoAdvance = false }) {
    commit('completeScheduleEntry')
    dispatch('checkSchedule')
    dispatch('timer/setNewTimer', state.schedule[0]._length, { root: true })

    const loggedEventType = isAutoAdvance ? UserEventType.SCHEDULE_ADVANCE_AUTO : UserEventType.SCHEDULE_ADVANCE_MANUAL
    dispatch('recordUserEvent', loggedEventType)
  },

  recordUserEvent ({ rootState, commit }, eventType = UserEventType.OTHER) {
    if (rootState.settings.eventLoggingEnabled) {
      commit('recordUserEvent', eventType)
    }
  }
}
