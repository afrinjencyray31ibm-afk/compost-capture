import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageData } = await req.json();
    
    if (!imageData) {
      throw new Error('No image data provided');
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Call Lovable AI for image classification
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are a waste classification expert. Analyze the image and classify the waste item as one of: biodegradable, plastic, or metal. Respond ONLY with a JSON object in this exact format: {\"type\": \"biodegradable|plastic|metal\", \"confidence\": 0.0-1.0, \"reasoning\": \"brief explanation\"}. Be strict and accurate."
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Classify this waste item. What type of waste is this?"
              },
              {
                type: "image_url",
                image_url: {
                  url: imageData
                }
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI service requires additional credits. Please contact support." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Failed to classify image");
    }

    const data = await response.json();
    const resultText = data.choices[0].message.content;
    
    console.log("AI response:", resultText);
    
    // Parse the JSON response
    let classification;
    try {
      // Try to extract JSON from the response
      const jsonMatch = resultText.match(/\{[^}]+\}/);
      if (jsonMatch) {
        classification = JSON.parse(jsonMatch[0]);
      } else {
        // Fallback parsing if AI doesn't return proper JSON
        const lowerText = resultText.toLowerCase();
        if (lowerText.includes('biodegradable')) {
          classification = { type: 'biodegradable', confidence: 0.75, reasoning: resultText };
        } else if (lowerText.includes('plastic')) {
          classification = { type: 'plastic', confidence: 0.75, reasoning: resultText };
        } else if (lowerText.includes('metal')) {
          classification = { type: 'metal', confidence: 0.75, reasoning: resultText };
        } else {
          throw new Error('Could not determine waste type from AI response');
        }
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      throw new Error('Invalid classification response from AI');
    }

    // Get disposal instructions based on type
    const disposalInstructions = getDisposalInstructions(classification.type);

    return new Response(
      JSON.stringify({
        wasteType: classification.type,
        confidence: classification.confidence,
        reasoning: classification.reasoning,
        disposalInstructions
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Classification error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error occurred" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function getDisposalInstructions(wasteType: string): string[] {
  const instructions: Record<string, string[]> = {
    biodegradable: [
      "Place in green/brown composting bin",
      "Keep separate from plastic and metal waste",
      "Can be used for home composting if available",
      "Breaks down naturally in 2-6 months"
    ],
    plastic: [
      "Rinse and clean before disposal",
      "Place in recycling bin (check local guidelines)",
      "Remove any labels or caps if possible",
      "Do not mix with biodegradable waste",
      "Takes 450+ years to decompose if not recycled"
    ],
    metal: [
      "Clean and dry before recycling",
      "Place in metal recycling bin",
      "Aluminum cans can be crushed to save space",
      "Highly recyclable - can be reused indefinitely",
      "Keep separate from other waste types"
    ]
  };

  return instructions[wasteType] || ["Please consult local waste management guidelines"];
}