"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Key, Plus, Search, User, MapPin, Calendar, AlertTriangle, CheckCircle } from "lucide-react"
import { toast } from "sonner"

interface KeyAsset {
  id: string
  code: string
  description: string
  status: "AVAILABLE" | "CHECKED_OUT" | "LOST"
  holder?: string
  holderName?: string
  checkedOutAt?: string
  location?: string
}

export default function AssetHandoverPage() {
    const [keys, setKeys] = useState<KeyAsset[]>([
        {
            id: "1",
            code: "K-101",
            description: "Front door key - 123 Main St",
            status: "AVAILABLE",
            location: "Office"
        },
        {
            id: "2", 
            code: "K-102",
            description: "Garage remote - 123 Main St",
            status: "CHECKED_OUT",
            holderName: "John Smith",
            holder: "contact-1",
            checkedOutAt: "2026-02-15T10:00:00Z",
            location: "With John Smith"
        },
        {
            id: "3",
            code: "K-103", 
            description: "Mailbox key - 456 Oak Ave",
            status: "LOST",
            location: "Unknown"
        }
    ])
    const [searchQuery, setSearchQuery] = useState("")
    const [statusFilter, setStatusFilter] = useState("all")
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
    const [isCheckoutDialogOpen, setIsCheckoutDialogOpen] = useState(false)
    const [selectedKey, setSelectedKey] = useState<KeyAsset | null>(null)

    const filteredKeys = keys.filter(key => {
        const matchesSearch = key.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           key.description.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesStatus = statusFilter === "all" || key.status === statusFilter
        return matchesSearch && matchesStatus
    })

    const getStatusColor = (status: string) => {
        switch (status) {
            case "AVAILABLE": return "bg-green-100 text-green-800"
            case "CHECKED_OUT": return "bg-blue-100 text-blue-800"
            case "LOST": return "bg-red-100 text-red-800"
            default: return "bg-gray-100 text-gray-800"
        }
    }

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "AVAILABLE": return <CheckCircle className="h-4 w-4" />
            case "CHECKED_OUT": return <User className="h-4 w-4" />
            case "LOST": return <AlertTriangle className="h-4 w-4" />
            default: return <Key className="h-4 w-4" />
        }
    }

    const handleCheckout = (key: KeyAsset) => {
        setSelectedKey(key)
        setIsCheckoutDialogOpen(true)
    }

    const handleCheckin = (keyId: string) => {
        setKeys(prev => prev.map(key => 
            key.id === keyId 
                ? { ...key, status: "AVAILABLE", holder: undefined, holderName: undefined, checkedOutAt: undefined, location: "Office" }
                : key
        ))
        toast.success("Key checked in successfully")
    }

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-medium">Asset & Key Management</h3>
                <p className="text-sm text-muted-foreground">
                    Manage property keys, access cards, and digital handovers.
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Total Keys</p>
                                <p className="text-2xl font-bold">{keys.length}</p>
                            </div>
                            <Key className="h-8 w-8 text-muted-foreground" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Available</p>
                                <p className="text-2xl font-bold text-green-600">
                                    {keys.filter(k => k.status === "AVAILABLE").length}
                                </p>
                            </div>
                            <CheckCircle className="h-8 w-8 text-green-600" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Checked Out</p>
                                <p className="text-2xl font-bold text-blue-600">
                                    {keys.filter(k => k.status === "CHECKED_OUT").length}
                                </p>
                            </div>
                            <User className="h-8 w-8 text-blue-600" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Lost</p>
                                <p className="text-2xl font-bold text-red-600">
                                    {keys.filter(k => k.status === "LOST").length}
                                </p>
                            </div>
                            <AlertTriangle className="h-8 w-8 text-red-600" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Search and Filters */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>Key Inventory</CardTitle>
                        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                            <DialogTrigger asChild>
                                <Button>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Key
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Add New Key</DialogTitle>
                                    <DialogDescription>
                                        Add a new key or access card to the inventory.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="key-code">Key Code</Label>
                                        <Input id="key-code" placeholder="e.g., K-104" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="key-description">Description</Label>
                                        <Input id="key-description" placeholder="e.g., Front door key - 123 Main St" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="key-location">Location</Label>
                                        <Input id="key-location" placeholder="e.g., Office" />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                                        Cancel
                                    </Button>
                                    <Button onClick={() => {
                                        toast.success("Key added successfully")
                                        setIsAddDialogOpen(false)
                                    }}>
                                        Add Key
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-4 mb-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search keys..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-8"
                            />
                        </div>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-40">
                                <SelectValue placeholder="Filter status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="AVAILABLE">Available</SelectItem>
                                <SelectItem value="CHECKED_OUT">Checked Out</SelectItem>
                                <SelectItem value="LOST">Lost</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Keys Table */}
                    <div className="border rounded-lg overflow-hidden">
                        <div className="bg-gray-50 px-4 py-3 border-b">
                            <div className="grid grid-cols-7 gap-4 text-sm font-medium text-gray-900">
                                <div>Code</div>
                                <div>Description</div>
                                <div>Status</div>
                                <div>Holder</div>
                                <div>Location</div>
                                <div>Last Action</div>
                                <div>Actions</div>
                            </div>
                        </div>
                        <div className="divide-y">
                            {filteredKeys.map((key) => (
                                <div key={key.id} className="px-4 py-3 hover:bg-gray-50">
                                    <div className="grid grid-cols-7 gap-4 items-center">
                                        <div className="font-medium">{key.code}</div>
                                        <div className="text-sm">{key.description}</div>
                                        <div>
                                            <Badge className={getStatusColor(key.status)}>
                                                <div className="flex items-center gap-1">
                                                    {getStatusIcon(key.status)}
                                                    {key.status.replace('_', ' ')}
                                                </div>
                                            </Badge>
                                        </div>
                                        <div className="text-sm">
                                            {key.holderName || "-"}
                                        </div>
                                        <div className="text-sm">
                                            <div className="flex items-center gap-1">
                                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                                {key.location || "-"}
                                            </div>
                                        </div>
                                        <div className="text-sm">
                                            {key.checkedOutAt ? (
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                                    {new Date(key.checkedOutAt).toLocaleDateString()}
                                                </div>
                                            ) : "-"}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                {key.status === "AVAILABLE" && (
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleCheckout(key)}
                                                    >
                                                        Check Out
                                                    </Button>
                                                )}
                                                {key.status === "CHECKED_OUT" && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleCheckin(key.id)}
                                                    >
                                                        Check In
                                                    </Button>
                                                )}
                                                {key.status === "LOST" && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => {
                                                            setKeys(prev => prev.map(k => 
                                                                k.id === key.id 
                                                                    ? { ...k, status: "AVAILABLE", location: "Office" }
                                                                    : k
                                                            ))
                                                            toast.success("Key marked as found")
                                                        }}
                                                    >
                                                        Mark Found
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Checkout Dialog */}
            <Dialog open={isCheckoutDialogOpen} onOpenChange={setIsCheckoutDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Check Out Key</DialogTitle>
                        <DialogDescription>
                            Assign this key to a contact or team member.
                        </DialogDescription>
                    </DialogHeader>
                    {selectedKey && (
                        <div className="space-y-4">
                            <div className="p-4 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-2">
                                    <Key className="h-5 w-5" />
                                    <span className="font-medium">{selectedKey.code}</span>
                                </div>
                                <p className="text-sm text-muted-foreground">{selectedKey.description}</p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="holder">Assign To</Label>
                                <Select>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select contact or team member" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="contact-1">John Smith</SelectItem>
                                        <SelectItem value="contact-2">Jane Doe</SelectItem>
                                        <SelectItem value="team-1">Team Member 1</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="notes">Notes</Label>
                                <Input placeholder="Optional notes about this checkout" />
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCheckoutDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={() => {
                            if (selectedKey) {
                                setKeys(prev => prev.map(key => 
                                    key.id === selectedKey.id 
                                        ? { 
                                            ...key, 
                                            status: "CHECKED_OUT", 
                                            holderName: "John Smith",
                                            holder: "contact-1",
                                            checkedOutAt: new Date().toISOString(),
                                            location: "With John Smith"
                                        }
                                        : key
                                ))
                                toast.success("Key checked out successfully")
                            }
                            setIsCheckoutDialogOpen(false)
                        }}>
                            Check Out
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
