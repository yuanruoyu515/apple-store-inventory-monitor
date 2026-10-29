use apw_core::apple::{pickup_query, pickup_query_for_scope};
use apw_core::catalog::Catalog;
use apw_core::config::Settings;
use apw_core::model::{Category, region_by_locale};
use std::collections::HashSet;

#[test]
fn international_catalogs_and_policies_do_not_cross_regions() {
    let catalog = Catalog::new();
    for (locale, path, suffix, count, store) in [
        ("en_US", "", "LL/A", 269, "R250"),
        ("en_CA", "/ca", "VC/A", 28, "R121"),
        ("en_AE", "/ae", "AH/A", 5, "R597"),
    ] {
        let region = region_by_locale(locale).unwrap();
        assert_eq!(
            region.pickup_message_url(),
            format!("https://www.apple.com{path}/shop/retail/pickup-message")
        );
        assert_eq!(
            region.bag_url(),
            format!("https://www.apple.com{path}/shop/bag")
        );
        assert_eq!(
            region.session_page_url(),
            format!("https://www.apple.com{path}/")
        );
        assert_eq!(catalog.stores(locale).unwrap().len(), count);
        assert!(catalog.store_by_number(locale, store).is_some());
        let products = catalog.products(locale).unwrap();
        assert_eq!(products.len(), 40);
        assert_eq!(
            products
                .iter()
                .map(|p| &p.part_number)
                .collect::<HashSet<_>>()
                .len(),
            40
        );
        assert!(
            products
                .iter()
                .all(|p| p.part_number.ends_with(suffix) && p.category == Category::Iphone)
        );
        let parts = vec![products[0].part_number.clone()];
        for query in [
            pickup_query(region, store, &parts),
            pickup_query_for_scope(region, ("location", "Dubai"), &parts),
        ] {
            assert_eq!(
                query.iter().filter(|(key, _)| key == "cppart").count(),
                usize::from(locale == "en_US")
            );
            assert!(query.contains(&("parts.0".into(), parts[0].clone())));
        }
        let mut settings = Settings {
            locale: locale.into(),
            ..Settings::default()
        };
        settings.normalize();
        assert_eq!(settings.locale, locale);
    }
    for (id, city) in [
        ("R597", "Dubai"),
        ("R596", "Dubai"),
        ("R706", "Abu Dhabi"),
        ("R595", "Abu Dhabi"),
        ("R785", "Al Ain"),
    ] {
        assert!(
            catalog
                .store_by_number("en_AE", id)
                .unwrap()
                .title
                .contains(city)
        );
    }
    assert!(catalog.product_by_part("en_AE", "MK254VC/A").is_none());
    assert!(catalog.store_by_number("en_AE", "R121").is_none());
    assert_eq!(
        catalog
            .store_by_number("en_US", "R250")
            .unwrap()
            .pickup_location("en_US")
            .as_deref(),
        Some("10014")
    );
    assert_eq!(
        catalog
            .store_by_number("en_CA", "R121")
            .unwrap()
            .pickup_location("en_CA")
            .as_deref(),
        Some("M5B 2H1")
    );
    assert_eq!(
        region_by_locale("en_US").unwrap().education_bag_url(),
        "https://www.apple.com/us-edu/shop/bag"
    );
}
