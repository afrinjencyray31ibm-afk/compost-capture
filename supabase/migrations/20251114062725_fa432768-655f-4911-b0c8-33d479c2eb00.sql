-- Create waste classifications table
CREATE TABLE public.waste_classifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  waste_type TEXT NOT NULL CHECK (waste_type IN ('biodegradable', 'plastic', 'metal')),
  image_url TEXT,
  confidence FLOAT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.waste_classifications ENABLE ROW LEVEL SECURITY;

-- Create policy for anyone to insert (no auth required for now)
CREATE POLICY "Anyone can insert classifications"
ON public.waste_classifications
FOR INSERT
WITH CHECK (true);

-- Create policy for anyone to view classifications
CREATE POLICY "Anyone can view classifications"
ON public.waste_classifications
FOR SELECT
USING (true);

-- Create index for faster queries
CREATE INDEX idx_waste_classifications_created_at ON public.waste_classifications(created_at DESC);
CREATE INDEX idx_waste_classifications_waste_type ON public.waste_classifications(waste_type);