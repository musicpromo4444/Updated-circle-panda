-- Keep internal helper functions out of the Data API execution surface.
-- They are called by server-side SECURITY DEFINER functions and triggers.
revoke execute on all functions in schema private from public;
revoke execute on all functions in schema private from anon;
