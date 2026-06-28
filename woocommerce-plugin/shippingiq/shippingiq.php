<?php
/**
 * Plugin Name:       ShippingIQ - Freight Calculator for WooCommerce
 * Plugin URI:        https://shippingiq.com.au
 * Description:       Real-time freight rates at WooCommerce checkout, powered by ShippingIQ.
 * Version:           1.2.2
 * Author:            ShippingIQ
 * License:           GPL v2 or later
 * Text Domain:       shippingiq
 * Requires Plugins:  woocommerce
 * WC requires at least: 6.0
 * WC tested up to:   10.7
 */

defined( 'ABSPATH' ) || exit;

// Declare HPOS compatibility so WooCommerce doesn't show a warning.
add_action( 'before_woocommerce_init', function () {
	if ( class_exists( '\Automattic\WooCommerce\Utilities\FeaturesUtil' ) ) {
		\Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility( 'custom_order_tables', __FILE__, true );
	}
} );

// Load the admin account page (always, so the menu registers on every admin request).
if ( is_admin() ) {
	require_once plugin_dir_path( __FILE__ ) . 'includes/class-shippingiq-admin.php';
	new ShippingIQ_Admin();
}

// Load the shipping method class once WooCommerce is ready.
add_action( 'woocommerce_shipping_init', 'shippingiq_load_shipping_method' );
function shippingiq_load_shipping_method() {
	require_once plugin_dir_path( __FILE__ ) . 'includes/class-wc-shipping-shippingiq.php';
}

// Register the shipping method with WooCommerce.
add_filter( 'woocommerce_shipping_methods', 'shippingiq_register_shipping_method' );
function shippingiq_register_shipping_method( $methods ) {
	$methods['shippingiq'] = 'ShippingIQ_Shipping_Method';
	return $methods;
}
