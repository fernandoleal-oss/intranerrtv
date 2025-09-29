-- Add a special policy for trigger-based inserts
CREATE POLICY "Allow trigger inserts" 
ON public.profiles 
FOR INSERT 
WITH CHECK (true);

-- Update the trigger to use SECURITY DEFINER
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();