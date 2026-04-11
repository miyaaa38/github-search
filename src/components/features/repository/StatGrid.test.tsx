import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { StatGrid } from "./StatGrid"

describe("StatGrid", () => {
  it("Star・Watcher・Fork・Issue の 4 つの統計値が表示される", () => {
    render(<StatGrid stars={100} watchers={50} forks={20} issues={5} />)

    expect(screen.getByText("100")).toBeInTheDocument()
    expect(screen.getByText("50")).toBeInTheDocument()
    expect(screen.getByText("20")).toBeInTheDocument()
    expect(screen.getByText("5")).toBeInTheDocument()
  })

  it("各統計値に対応するラベルが表示される", () => {
    render(<StatGrid stars={0} watchers={0} forks={0} issues={0} />)

    expect(screen.getByText("Stars")).toBeInTheDocument()
    expect(screen.getByText("Watchers")).toBeInTheDocument()
    expect(screen.getByText("Forks")).toBeInTheDocument()
    expect(screen.getByText("Issues")).toBeInTheDocument()
  })

  it("1000 以上の値は k 表記で短縮される", () => {
    render(<StatGrid stars={12345} watchers={0} forks={0} issues={0} />)

    expect(screen.getByText("12.3k")).toBeInTheDocument()
  })
})
