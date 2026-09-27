import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ModalAtleta from '../../src/components/ModalAtleta'

function renderModal(atleta, onGuardar = () => {}) {
  render(
    <ModalAtleta
      atleta={{ id: 5, dorsal: '10', nombre: 'Ana', apellido: 'Lopez', ...atleta }}
      categorias={[]}
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
