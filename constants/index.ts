const PROD_WEBSITE_URL =
  process.env.NEXT_PUBLIC_WEBSITE_URL && !process.env.NEXT_PUBLIC_WEBSITE_URL.includes("localhost")
    ? process.env.NEXT_PUBLIC_WEBSITE_URL
    : "https://ebenezarenterprises.com";

const LOCAL_WEBSITE_URL = process.env.NEXT_PUBLIC_DEV_WEBSITE_URL || "http://localhost:5173";

export const sidebarLinks = [
  {
    imgURL: "/icons/home.svg",
    route: "/",
    label: "Dashboard",
  },
  {
    imgURL: "/icons/transaction.svg",
    route: "/vehicles",
    label: "Yard Stock",
  },
  {
    imgURL: "/icons/transaction.svg",
    route: "/loans",
    label: "Agreements",
  },
  {
    imgURL: "/icons/dollar-circle.svg",
    route: "/clients",
    label: "Clients",
  },
  {
    imgURL: "/icons/home.svg",
    route: process.env.NODE_ENV === "production" ? PROD_WEBSITE_URL : LOCAL_WEBSITE_URL,
    label: "Website",
  },
  {
    imgURL: "/icons/transaction.svg",
    route: "/reports",
    label: "Reports",
  },
  {
    imgURL: "/icons/transaction.svg",
    route: "/communications",
    label: "Communications",
  },
  {
    imgURL: "/icons/transaction.svg",
    route: "/website-leads",
    label: "Website Messages",
  },
  {
    imgURL: "/icons/transaction.svg",
    route: "/documents",
    label: "Legal Documents",
  },
  {
    imgURL: "/icons/dollar-circle.svg",
    route: "/expenses",
    label: "Expenses",
  },
];
