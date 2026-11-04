import { describe, expect, it } from 'bun:test'
import { buildBookingNotes, getBookingUserNotes } from '../../../../../apps/request/src/features/booking-notes'

describe('booking notes', () => {
  it('includes preset equipment when the requester leaves notes blank', () => {
    const requestedEquipment = ['Wireless Microphone', 'Camera']
    expect(buildBookingNotes({ notes: '', requestedEquipment, otherEquipment: '' })).toBe(
      'Equipment booked:\n- Camera\n- Wireless Microphone',
    )
    expect(requestedEquipment).toEqual(['Wireless Microphone', 'Camera'])
  })

  it('appends presets and other equipment below the requester’s multiline notes', () => {
    expect(buildBookingNotes({
      notes: 'Collect after rehearsal.\nPlease include batteries.',
      requestedEquipment: ['Camera'],
      otherEquipment: ' Tripod\r\n\r\n  Spare batteries ',
    })).toBe('Collect after rehearsal.\nPlease include batteries.\n\nEquipment booked:\n- Camera\n- Tripod\n- Spare batteries')
  })

  it('includes other equipment even when no preset is selected', () => {
    expect(buildBookingNotes({ notes: null, requestedEquipment: [], otherEquipment: 'Tripod' })).toBe(
      'Equipment booked:\n- Tripod',
    )
  })

  it('omits an empty equipment summary', () => {
    const data = { notes: 'Please call before collection.', requestedEquipment: [], otherEquipment: '  ' }
    expect(buildBookingNotes(data)).toBe(data.notes)
    expect(getBookingUserNotes(data)).toBe(data.notes)
    expect(buildBookingNotes({ ...data, notes: null })).toBe('')
  })

  it('normalizes preset labels in the same way as the booking API', () => {
    expect(buildBookingNotes({ notes: '', requestedEquipment: [' Speaker ', '', 'Camera', 'Camera'], otherEquipment: '' })).toBe(
      'Equipment booked:\n- Camera\n- Speaker',
    )
  })

  it('recovers the requester’s notes after the API reorders preset selections', () => {
    const data = { notes: 'Keep this note.', requestedEquipment: ['Speaker', 'Camera'], otherEquipment: 'Tripod' }
    const stored = { ...data, notes: buildBookingNotes(data), requestedEquipment: ['Camera', 'Speaker'] }
    expect(getBookingUserNotes(stored)).toBe('Keep this note.')
    expect(buildBookingNotes({ ...stored, notes: getBookingUserNotes(stored) })).toBe(stored.notes)
  })

  it('recovers blank notes when only the equipment summary was saved', () => {
    const data = { notes: '', requestedEquipment: ['Camera'], otherEquipment: '' }
    expect(getBookingUserNotes({ ...data, notes: buildBookingNotes(data) })).toBe('')
  })

  it('preserves legacy and manually written notes without a matching generated suffix', () => {
    const data = { notes: 'Equipment booked:\n- Projector', requestedEquipment: ['Camera'], otherEquipment: '' }
    expect(getBookingUserNotes(data)).toBe(data.notes)
    expect(getBookingUserNotes({ ...data, notes: 'Please call before collection.' })).toBe('Please call before collection.')
    expect(getBookingUserNotes({ ...data, notes: null })).toBe('')
  })
})
