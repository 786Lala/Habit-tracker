import { render, screen } from '@testing-library/react'
import App from '../../App'

test('renders project title', () => {
  render(<App />)
  const title = screen.getByText(/HABIT JOURNAL/i)
  expect(title).toBeInTheDocument()
})
