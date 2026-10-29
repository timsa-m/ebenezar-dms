import { getClients, getClientFullProfile } from "../lib/actions/client.actions";

async function run() {
  console.log("Fetching clients...");
  const clients = await getClients();
  if (!clients || clients.length === 0) {
    console.log("No clients found.");
    return;
  }
  const firstClient = clients[0];
  console.log("First client ID:", firstClient.$id);
  
  console.log("Fetching profile for", firstClient.$id);
  const profile = await getClientFullProfile(firstClient.$id);
  if (!profile) {
    console.log("Profile is null! 404 would be thrown.");
  } else {
    console.log("Profile fetched successfully.");
  }
}

run();
