export const config = {
  whatsapp: {
    number: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER!,
    messages: {
      general: "Hi Akhil, I'm interested in ScaleCraft",
      product: (name: string) => 
        `Hi Akhil, I'm interested in the ${name}`,
      newsletter: "Hi Akhil, I want to subscribe to the ScaleCraft Weekly",
    }
  },
  site: {
    url: process.env.NEXT_PUBLIC_SITE_URL!,
    name: 'ScaleCraft',
    founder: 'Akhil',
  }
}

export const waLink = (message: string) =>
  `https://wa.me/${config.whatsapp.number}?text=${encodeURIComponent(message)}`
