import { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/components/AuthProvider'
import { Chrome, Shield } from 'lucide-react'

export default function Login() {
  const { user, loading, signInWithGoogle } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background/95 to-muted">
        <div className="animate-pulse">
          <div className="h-8 w-32 bg-muted rounded mb-4"></div>
          <div className="h-4 w-48 bg-muted/70 rounded"></div>
        </div>
      </div>
    )
  }

  if (user) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background/95 to-muted px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="glass-card">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-foreground">
                Orçamento de Produção
              </CardTitle>
              <CardDescription className="text-base mt-2">
                <span className="font-semibold text-primary">RTV WE</span>
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 border border-border/50">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">
                      Acesso Restrito
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Apenas usuários com e-mail <span className="font-semibold text-primary">@we.com.br</span> podem acessar este sistema.
                    </p>
                  </div>
                </div>
              </div>

              <Button
                onClick={signInWithGoogle}
                size="lg"
                className="w-full h-12 gap-3 font-medium"
              >
                <Chrome className="w-5 h-5" />
                Entrar com Google
              </Button>
            </div>

            <div className="text-center">
              <p className="text-xs text-muted-foreground">
                Sistema interno para criação e gerenciamento de orçamentos de produção audiovisual
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}