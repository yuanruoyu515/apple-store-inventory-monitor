use std::collections::HashSet;

use apw_core::apple::pickup_query;
use apw_core::catalog::Catalog;
use apw_core::config::Settings;
use apw_core::model::{Category, Target, region_by_locale};

#[test]
fn 加拿大目录覆盖省城市与全部独立型号() {
    let catalog = Catalog::new();
    let stores = catalog.stores("en_CA").unwrap();
    let products = catalog.products("en_CA").unwrap();
    assert_eq!(stores.len(), 28);
    assert_eq!(products.len(), 40);
    for (id, province, city) in [
        ("R121", "Ontario", "Toronto"),
        ("R280", "British Columbia", "Vancouver"),
        ("R248", "Quebec", "Montreal"),
    ] {
        let store = catalog.store_by_number("en_CA", id).unwrap();
        assert!(store.title.contains(province), "{}", store.title);
        assert!(store.title.contains(city), "{}", store.title);
    }
    let mut parts = HashSet::new();
    for product in &products {
        assert!(product.part_number.ends_with("VC/A"));
        assert!(parts.insert(&product.part_number));
        assert_eq!(product.category, Category::Iphone);
        assert!(
            catalog
                .product_by_part("en_US", &product.part_number)
                .is_none()
        );
    }
    assert!(catalog.product_by_part("en_CA", "MK1F4LL/A").is_none());
    assert!(catalog.store_by_number("en_CA", "R250").is_none());
    for (part, title) in [
        ("MJR64VC/A", "iPhone 18 Pro 256GB Silver"),
        ("MJX64VC/A", "iPhone 18 Pro Max 256GB Silver"),
        ("MK254VC/A", "iPhone Duo 256GB Night Sky"),
    ] {
        assert_eq!(catalog.product_by_part("en_CA", part).unwrap().title, title);
    }
    assert_eq!(
        products.iter().filter(|p| p.family == "iphoneduo").count(),
        8
    );
    for family in ["iphone18pro", "iphone18promax", "iphoneduo"] {
        let capacities: HashSet<_> = products
            .iter()
            .filter(|p| p.family == family)
            .map(|p| p.capacity.as_str())
            .collect();
        assert_eq!(capacities, HashSet::from(["256GB", "512GB", "1TB", "2TB"]));
    }
}

#[test]
fn 加拿大请求与结账链接始终在加拿大站且不带美国运营商参数() {
    let ca = region_by_locale("en_CA").unwrap();
    assert_eq!(ca.title, "Canada");
    assert_eq!(ca.accept_language(), "en-CA,en;q=0.9");
    assert_eq!(
        ca.pickup_message_url(),
        "https://www.apple.com/ca/shop/fulfillment-messages"
    );
    assert_eq!(ca.bag_url(), "https://www.apple.com/ca/shop/bag");
    for family in ca.families_in(Category::Iphone) {
        assert!(
            ca.buy_page_url(family)
                .starts_with("https://www.apple.com/ca/shop/buy-iphone/")
        );
    }
    let parts = vec!["MJR64VC/A".into(), "MK254VC/A".into()];
    let query = pickup_query(ca, "R121", &parts);
    assert!(query.contains(&("parts.0".into(), "MJR64VC/A".into())));
    assert!(query.contains(&("parts.1".into(), "MK254VC/A".into())));
    assert!(query.contains(&("store".into(), "R121".into())));
    assert!(!query.iter().any(|(key, _)| key == "cppart"));
    let us = pickup_query(
        region_by_locale("en_US").unwrap(),
        "R250",
        &["MJQ44LL/A".into()],
    );
    assert!(us.contains(&("cppart".into(), "UNLOCKED/US".into())));
    let mut settings = Settings {
        locale: "en_CA".into(),
        ..Settings::default()
    };
    settings.normalize();
    assert_eq!(settings.locale, "en_CA");
    let target = Target {
        locale: "en_CA".into(),
        store_number: "R121".into(),
        store_title: "Toronto".into(),
        part_number: "MK254VC/A".into(),
        product_name: "iPhone Duo".into(),
        companion_part: None,
        companion_name: None,
        kit_part: None,
    };
    assert_eq!(
        target.purchase_url(None).unwrap(),
        "https://www.apple.com/ca/shop/product/MK254VC/A"
    );
}
