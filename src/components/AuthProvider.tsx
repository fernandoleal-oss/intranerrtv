import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

interface Profile {
  id: string
  user_id: string
  email: string
  name: string | null
  role: 'admin' | 'rtv' | 'financeiro'
}

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: Profile | null
  loading: boolean
  signInWithEmail: (email: string, password: string) => Promise<{ error: any }>
  signUpWithEmail: (email: string, password: string, name: string) => Promise<{ error: any }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        
        if (session?.user) {
          // Fetch user profile
          setTimeout(async () => {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('*')
              .eq('user_id', session.user.id)
              .single()
            
            setProfile(profileData)
          }, 0)
        } else {
          setProfile(null)
        }
        
        setLoading(false)
      }
    )

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (!session) {
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signInWithEmail = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        toast({
          title: 'Erro no login',
          description: error.message,
          variant: 'destructive'
        })
        return { error }
      }

      toast({
        title: 'Login realizado',
        description: 'Bem-vindo ao sistema!'
      })
      return { error: null }
    } catch (error) {
      toast({
        title: 'Erro no login',
        description: 'Falha ao fazer login',
        variant: 'destructive'
      })
      return { error }
    }
  }

  const signUpWithEmail = async (email: string, password: string, name: string) => {
    try {
      // Validate @we.com.br domain
      if (!email.endsWith('@we.com.br')) {
        toast({
          title: 'Email inválido',
          description: 'Apenas emails @we.com.br são permitidos',
          variant: 'destructive'
        })
        return { error: { message: 'Domínio não autorizado' } }
      }

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            name: name,
            full_name: name
          }
        }
      })

      if (error) {
        toast({
          title: 'Erro no cadastro',
          description: error.message,
          variant: 'destructive'
        })
        return { error }
      }

      toast({
        title: 'Cadastro realizado',
        description: 'Verifique seu email para confirmar a conta'
      })
      return { error: null }
    } catch (error) {
      toast({
        title: 'Erro no cadastro',
        description: 'Falha ao criar conta',
        variant: 'destructive'
      })
      return { error }
    }
  }

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
      toast({
        title: 'Logout realizado',
        description: 'Você foi desconectado com sucesso'
      })
    } catch (error) {
      toast({
        title: 'Erro no logout',
        description: 'Falha ao desconectar',
        variant: 'destructive'
      })
    }
  }

  const value = {
    user,
    session,
    profile,
    loading,
    signInWithEmail,
    signUpWithEmail,
    signOut
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}