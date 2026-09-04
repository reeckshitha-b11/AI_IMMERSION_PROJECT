/*
# AfterCare — Lock Signup Trigger Function

1. Purpose
   The profile creation function is intended to run only as an internal
   database trigger when Supabase creates a new account.

2. Security
   Revoke direct EXECUTE access from anonymous and signed-in API roles. The
   trigger continues to invoke the function as its owner, while the function
   is no longer exposed as a callable public RPC endpoint.
*/

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
