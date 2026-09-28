import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ModalAtleta from '../../src/components/ModalAtleta'

function renderModal(atleta, onGuardar = () => {}, distancias = []) {
  render(
    <ModalAtleta
      atleta={{ id: 5, dorsal: '10', nombre: 'Ana', apellido: 'Lopez', ...atleta }}
      categorias={[]}
      distancias={distancias}
      onGuardar={onGuardar}
      onCerrar={() => {}}
    />,
  )
  return screen.getByRole('spinbutton')
}

describe('ModalAtleta — año de nacimiento', () => {
  it('shows an empty box when the stored year is 0 (old CSV imports)', () => {
    const año = renderModal({ añoNacimiento: 0 })
    expect(año.value).toBe('')
  })

  it('clearing the year leaves the box empty and saves null', () => {
    const onGuardar = vi.fn()
    const año = renderModal({ añoNacimiento: 1990 }, onGuardar)

    fireEvent.change(año, { target: { value: '' } })
    expect(año.value).toBe('')

    fireEvent.click(screen.getByText('Guardar'))
    expect(onGuardar).toHaveBeenCalledWith(expect.objectContaining({ añoNacimiento: null }))
  })
})

describe('ModalAtleta — distancia', () => {
  const sprint = { id: 'd-1', nombre: 'Sprint' }
  const olimpico = { id: 'd-2', nombre: 'Olímpico' }

  it('preselects the only distance and saves it', () => {
    const onGuardar = vi.fn()
    renderModal({}, onGuardar, [sprint])
    expect(screen.getByRole('combobox', { name: 'Distancia *' })).toHaveDisplayValue('Sprint')

    fireEvent.click(screen.getByText('Guardar'))
    expect(onGuardar).toHaveBeenCalledWith(expect.objectContaining({ distanciaId: 'd-1' }))
  })

  it('with several distances, Guardar waits until one is chosen', () => {
    const onGuardar = vi.fn()
    renderModal({}, onGuardar, [sprint, olimpico])
    expect(screen.getByText('Guardar')).toBeDisabled()

    fireEvent.change(screen.getByRole('combobox', { name: 'Distancia *' }), { target: { value: 'd-2' } })
    fireEvent.click(screen.getByText('Guardar'))
    expect(onGuardar).toHaveBeenCalledWith(expect.objectContaining({ distanciaId: 'd-2' }))
  })

  it("keeps the athlete's current distance when editing", () => {
    renderModal({ distanciaId: 'd-2' }, () => {}, [sprint, olimpico])
    expect(screen.getByRole('combobox', { name: 'Distancia *' })).toHaveDisplayValue('Olímpico')
  })
})
