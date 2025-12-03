// utils for Messages

import { toast_msg } from "../shared/utils";

export async function signMessage(mid: string, child_key: string, hass: any) {
  try {
    await hass.callService("bakalari", "mark_message_as_seen", {
      child_key: child_key,
      message_id: mid
    });
  }
  catch (err) {
    toast_msg("Nepodařilo se podepsat zprávu. (" + err + ")", 4000)
  }
  finally {
    toast_msg("Zpráva (" + mid + ") ozančena jako přečtená.", 4000);
  }
}
