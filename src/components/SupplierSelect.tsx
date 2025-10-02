import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

type Supplier = {
  id: string;
  name: string;
  type: string;
  contact_name?: string;
  email?: string;
};

type SupplierSelectProps = {
  value: string;
  onChange: (value: string) => void;
  type?: 'producao' | 'audio' | 'imagem';
  placeholder?: string;
};

export function SupplierSelect({ value, onChange, type, placeholder }: SupplierSelectProps) {
  const { toast } = useToast();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [open, setOpen] = useState(false);
  const [newSupplier, setNewSupplier] = useState({
    name: '',
    type: type || 'producao',
    contact_name: '',
    email: '',
  });

  useEffect(() => {
    loadSuppliers();
  }, [type]);

  const loadSuppliers = async () => {
    let query = supabase.from('suppliers').select('*').order('name');
    
    if (type) {
      query = query.eq('type', type);
    }

    const { data } = await query;
    setSuppliers(data || []);
  };

  const handleAddSupplier = async () => {
    if (!newSupplier.name.trim()) {
      toast({ title: 'Nome obrigatório', variant: 'destructive' });
      return;
    }

    const { data, error } = await supabase
      .from('suppliers')
      .insert([newSupplier])
      .select()
      .single();

    if (error) {
      toast({ title: 'Erro ao cadastrar', description: error.message, variant: 'destructive' });
      return;
    }

    setSuppliers(prev => [...prev, data]);
    onChange(data.name);
    setOpen(false);
    setNewSupplier({ name: '', type: type || 'producao', contact_name: '', email: '' });
    toast({ title: 'Produtora cadastrada!' });
  };

  return (
    <div className="flex gap-2">
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="flex-1">
          <SelectValue placeholder={placeholder || 'Selecione...'} />
        </SelectTrigger>
        <SelectContent>
          {suppliers.map(s => (
            <SelectItem key={s.id} value={s.name}>
              {s.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button type="button" variant="outline" size="icon">
            <Plus className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cadastrar Produtora</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome da Produtora *</Label>
              <Input
                value={newSupplier.name}
                onChange={e => setNewSupplier(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nome da produtora"
              />
            </div>
            <div>
              <Label>Tipo</Label>
            <Select
              value={newSupplier.type}
              onValueChange={(value: 'producao' | 'audio' | 'imagem') => setNewSupplier(prev => ({ ...prev, type: value }))}
            >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="producao">Produção</SelectItem>
                  <SelectItem value="audio">Áudio</SelectItem>
                  <SelectItem value="imagem">Imagem</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Contato</Label>
              <Input
                value={newSupplier.contact_name}
                onChange={e => setNewSupplier(prev => ({ ...prev, contact_name: e.target.value }))}
                placeholder="Nome do contato"
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={newSupplier.email}
                onChange={e => setNewSupplier(prev => ({ ...prev, email: e.target.value }))}
                placeholder="email@exemplo.com"
              />
            </div>
            <Button onClick={handleAddSupplier} className="w-full">
              Cadastrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}