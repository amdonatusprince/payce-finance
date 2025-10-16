import React, { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Copy } from "lucide-react"
import { toast } from "sonner"
import QRCode from "qrcode"
import { default as ProtectedButton } from "@/components/protected-button"

// Bitcoin address validation
const validateBech32 = (address: string) => {
  // Basic bech32 validation
  if (!address.startsWith("bc1")) return false
  if (address.length < 14 || address.length > 74) return false

  // Check characters are valid
  const CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l"
  const rest = address.slice(3)
  return rest.split("").every((char) => CHARSET.includes(char.toLowerCase()))
}

const DepositInterface = () => {
  const [depositAddress, setDepositAddress] = useState<string | null>(null)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [isValid, setIsValid] = useState(false)

  // Generate QR code when address changes
  useEffect(() => {
    if (depositAddress) {
      QRCode.toDataURL(depositAddress, {
        width: 200,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#ffffff",
        },
      })
        .then((url) => setQrCode(url))
        .catch(() => {
          toast.error("Failed to generate QR code")
          setQrCode(null)
        })
    } else {
      setQrCode(null)
    }
  }, [depositAddress])

  const generateAddress = () => {
    // Mock address generation - in production this would come from the backend
    const mockAddress = "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh"

    // Validate address before setting
    if (validateBech32(mockAddress)) {
      setDepositAddress(mockAddress)
      setIsValid(true)
    } else {
      toast.error("Invalid deposit address generated")
      setIsValid(false)
    }
  }

  const copyAddress = () => {
    if (depositAddress) {
      navigator.clipboard.writeText(depositAddress)
      toast.success("Address copied to clipboard")
    }
  }

  return (
    <div className="max-w-md mx-auto mt-8 space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-6 text-center">
            <h2 className="text-2xl font-bold">Deposit BTC</h2>
            <p className="text-gray-500">
              Generate a unique Bitcoin address to deposit BTC into Tigris
            </p>

            {!depositAddress ? (
              <ProtectedButton className="w-full" onClick={generateAddress}>
                Generate Deposit Address
              </ProtectedButton>
            ) : (
              <div className="space-y-4">
                {/* QR Code */}
                {qrCode && isValid && (
                  <div className="flex justify-center">
                    <div className="bg-white p-4 rounded-lg shadow-sm">
                      <img
                        src={qrCode}
                        alt="Deposit QR Code"
                        className="w-48 h-48"
                      />
                    </div>
                  </div>
                )}

                {/* Address Display */}
                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-500">
                    Your deposit address:
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <code
                      className={`px-3 py-2 rounded text-sm break-all ${
                        isValid ? "bg-gray-100" : "bg-red-50 text-red-600"
                      }`}
                    >
                      {depositAddress}
                    </code>
                    {isValid && (
                      <Button variant="ghost" size="icon" onClick={copyAddress}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {isValid ? (
                  <div className="text-sm text-gray-500">
                    Only send BTC to this address. Funds will appear in your
                    account after 2 confirmations.
                  </div>
                ) : (
                  <div className="text-sm text-red-600">
                    Invalid address generated. Please try again or contact
                    support.
                  </div>
                )}

                {/* Regenerate button if invalid */}
                {!isValid && (
                  <ProtectedButton className="w-full" onClick={generateAddress}>
                    Generate New Address
                  </ProtectedButton>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default DepositInterface
