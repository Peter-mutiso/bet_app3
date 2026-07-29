'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

interface AuthModalsProps {
  isOpen: boolean
  onClose: () => void
  initialMode: 'login' | 'register'
  onSuccess: (user: any) => void
  settings?: any
}

export default function AuthModals({ isOpen, onClose, initialMode, onSuccess, settings }: AuthModalsProps) {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    username: '',
    phone: '',
    password: '',
    ref_code: '',
  })

  // Pre-fill ref code from URL param or cookie
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const refFromUrl = params.get('ref') || ''
    const refFromCookie = document.cookie.split('; ').find(r => r.startsWith('ref_code='))?.split('=')[1] || ''
    const ref = refFromUrl || refFromCookie
    if (ref) setFormData(f => ({ ...f, ref_code: ref }))
  }, [isOpen])

  // Sync mode when initialMode changes
  useEffect(() => { setMode(initialMode) }, [initialMode])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (mode === 'register') {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: formData.username,
            phone: formData.phone,
            password: formData.password,
            ref_code: formData.ref_code.trim() || undefined,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to register')
        toast.success('Registration successful!')
        onSuccess(data.user)
      } else {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: formData.phone, password: formData.password }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to login')
        toast.success('Login successful!')
        onSuccess(data.user)
      }
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-[#111827] border-[#1f2937] text-white sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            {mode === 'login' ? 'Welcome Back' : 'Create Account'}
          </DialogTitle>
          <div className="text-gray-400 text-center text-sm">
            {mode === 'login' ? 'Sign in to access your trading account' : `Join ${settings?.site_name || ''}`}
          </div>
        </DialogHeader>

        <div className="flex gap-4 border-b border-[#1f2937] pb-2 mt-2">
          <button
            className={`flex-1 text-center font-bold pb-2 border-b-2 ${mode === 'login' ? 'border-[#22c55e] text-[#22c55e]' : 'border-transparent text-gray-400'}`}
            onClick={() => setMode('login')}
          >
            Login
          </button>
          <button
            className={`flex-1 text-center font-bold pb-2 border-b-2 ${mode === 'register' ? 'border-[#22c55e] text-[#22c55e]' : 'border-transparent text-gray-400'}`}
            onClick={() => setMode('register')}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {mode === 'register' && (
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wider mb-1 block">Username</label>
              <Input
                required
                value={formData.username}
                onChange={e => setFormData({ ...formData, username: e.target.value })}
                placeholder="Username"
                className="bg-[#1f2937] border-[#374151]"
              />
            </div>
          )}

          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wider mb-1 block">
              {mode === 'login' ? 'Username or Phone' : 'Phone Number'}
            </label>
            <Input
              required
              value={formData.phone}
              onChange={e => setFormData({ ...formData, phone: e.target.value })}
              placeholder="Phone number"
              className="bg-[#1f2937] border-[#374151]"
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wider mb-1 block">Password</label>
            <Input
              required
              type="password"
              value={formData.password}
              onChange={e => setFormData({ ...formData, password: e.target.value })}
              placeholder="••••••••"
              className="bg-[#1f2937] border-[#374151]"
            />
          </div>

          {mode === 'register' && (
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wider mb-1 block">
                Referral Code <span className="text-gray-600 normal-case">(optional)</span>
              </label>
              <Input
                value={formData.ref_code}
                onChange={e => setFormData({ ...formData, ref_code: e.target.value.toUpperCase() })}
                placeholder="e.g. AB12CD34"
                className="bg-[#1f2937] border-[#374151] font-mono tracking-widest"
              />
            </div>
          )}

          <Button type="submit" className="w-full bg-[#22c55e] hover:bg-[#16a34a] text-black font-bold h-12 text-lg mt-2" disabled={loading}>
            {loading ? 'Processing...' : mode === 'login' ? 'Sign In' : 'Sign Up'}
          </Button>

          <div className="text-center text-sm text-gray-400 mt-4">
            {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
            <button type="button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="text-[#22c55e] font-bold">
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
