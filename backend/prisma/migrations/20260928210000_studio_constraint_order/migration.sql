-- Retain foreign-key integrity while permitting complete parent-site/user cascades.
-- Direct deletion of a referenced locale or product still fails at COMMIT.
ALTER TABLE studio.content_items ALTER CONSTRAINT content_items_site_id_locale_fkey DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE studio.page_translations ALTER CONSTRAINT page_translations_site_id_locale_fkey DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE studio.checkout_orders ALTER CONSTRAINT checkout_orders_product_id_site_id_fkey DEFERRABLE INITIALLY DEFERRED;
