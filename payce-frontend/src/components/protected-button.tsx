import { useAccount } from "wagmi"
import { Button } from "./ui/button"
import { useConnectModal } from "@rainbow-me/rainbowkit"

const ProtectedButton = ({
  children,
  onClick,
  className = "",
  variant = "default",
  size = "default",
  disabled = false,
}: {
  children: React.ReactNode
  onClick?: () => void
  className?: string
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link"
  size?: "default" | "sm" | "lg" | "icon"
  disabled?: boolean
}) => {
  const { isConnected } = useAccount()
  const { openConnectModal } = useConnectModal()

  if (!isConnected) {
    return (
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={openConnectModal}
        disabled={disabled}
      >
        Connect Wallet
      </Button>
    )
  }

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={onClick}
    >
      {children}
    </Button>
  )
}

export default ProtectedButton
