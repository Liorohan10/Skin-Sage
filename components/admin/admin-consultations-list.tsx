"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Eye } from "lucide-react"

interface Consultation {
  id: string
  customer: {
    name: string
    email: string
    initials: string
  }
  date: string
  skinType: string
  products: number
  status: "completed" | "in-progress" | "abandoned"
}

const mockConsultations: Consultation[] = [
  {
    id: "CON-1234",
    customer: {
      name: "Sarah Johnson",
      email: "sarah.j@example.com",
      initials: "SJ",
    },
    date: "2025-05-03",
    skinType: "Combination",
    products: 5,
    status: "completed",
  },
  {
    id: "CON-1235",
    customer: {
      name: "Michael Chen",
      email: "michael.c@example.com",
      initials: "MC",
    },
    date: "2025-05-03",
    skinType: "Dry",
    products: 4,
    status: "completed",
  },
  {
    id: "CON-1236",
    customer: {
      name: "Emma Wilson",
      email: "emma.w@example.com",
      initials: "EW",
    },
    date: "2025-05-02",
    skinType: "Sensitive",
    products: 3,
    status: "completed",
  },
  {
    id: "CON-1237",
    customer: {
      name: "James Rodriguez",
      email: "james.r@example.com",
      initials: "JR",
    },
    date: "2025-05-02",
    skinType: "Oily",
    products: 0,
    status: "abandoned",
  },
  {
    id: "CON-1238",
    customer: {
      name: "Olivia Taylor",
      email: "olivia.t@example.com",
      initials: "OT",
    },
    date: "2025-05-01",
    skinType: "Combination",
    products: 0,
    status: "in-progress",
  },
]

export function AdminConsultationsList() {
  const [consultations] = useState<Consultation[]>(mockConsultations)

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800 hover:bg-green-100"
      case "in-progress":
        return "bg-blue-100 text-blue-800 hover:bg-blue-100"
      case "abandoned":
        return "bg-red-100 text-red-800 hover:bg-red-100"
      default:
        return ""
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date)
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Skin Type</TableHead>
            <TableHead>Products</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {consultations.map((consultation) => (
            <TableRow key={consultation.id}>
              <TableCell className="font-medium">{consultation.id}</TableCell>
              <TableCell>
                <div className="flex items-center space-x-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-pink-100 text-pink-800">
                      {consultation.customer.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{consultation.customer.name}</div>
                    <div className="text-xs text-gray-500">{consultation.customer.email}</div>
                  </div>
                </div>
              </TableCell>
              <TableCell>{formatDate(consultation.date)}</TableCell>
              <TableCell>{consultation.skinType}</TableCell>
              <TableCell>{consultation.products}</TableCell>
              <TableCell>
                <Badge className={getStatusColor(consultation.status)} variant="outline">
                  {consultation.status}
                </Badge>
              </TableCell>
              <TableCell>
                <Button variant="ghost" size="icon">
                  <Eye className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
