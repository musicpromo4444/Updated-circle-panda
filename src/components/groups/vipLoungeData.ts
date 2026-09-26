/** Shared VIP Lounge view models. Persistence is server-backed in Supabase. */
export type VipEvent = { id:string; title:string; host:string; category:string; dateTime:string; location:string; description:string; rsvps:number; hasRsvp:boolean };
export type VipGiveaway = { id:string; title:string; host:string; prize:string; bcAmount:number; endsIn:string; entriesCount:number; hasEntered:boolean; winner?:string; status:"active"|"ended"|"cancelled" };
export type VipPollOption = { id:string; text:string; votes:number };
export type VipPoll = { id:string; question:string; author:string; options:VipPollOption[]; userVotedOptionId?:string; totalVotes:number; createdAt:string };
export type VipMediaNote = { id:string; author:string; type:"voice"|"video"; title:string; duration:string; createdAt:string; caption?:string; mediaUrl?:string; likes:number; hasLiked?:boolean };
export type VipLoungeStorage = { events:VipEvent[]; giveaways:VipGiveaway[]; polls:VipPoll[]; notes:VipMediaNote[] };
