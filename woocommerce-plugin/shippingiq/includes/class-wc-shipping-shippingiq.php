<?php
defined( 'ABSPATH' ) || exit;

class ShippingIQ_Shipping_Method extends WC_Shipping_Method {

	/** @var string */
	public $api_url = '';

	/** @var string */
	public $merchant_id = '';

	/** @var string */
	public $supabase_url = '';

	/** @var string */
	public $supabase_anon_key = '';

	/** @var string */
	public $display_mode = 'all';

	public function __construct( $instance_id = 0 ) {
		$this->id                 = 'shippingiq';
		$this->instance_id        = absint( $instance_id );
		$this->method_title       = __( 'ShippingIQ', 'shippingiq' );
		$this->method_description = __( 'Real-time freight rates calculated live at checkout based on your carrier rate cards and eligibility rules.', 'shippingiq' );
		$this->supports           = array(
			'shipping-zones',
			'instance-settings',
		);

		$this->init();
	}

	public function init() {
		$this->init_form_fields();
		$this->init_settings();

		$this->title             = $this->get_option( 'title', 'Freight' );
		$this->api_url           = $this->get_option( 'api_url', 'https://soaxvqkkecqzarwmbeip.supabase.co/functions/v1/calculate-freight' );
		$this->merchant_id       = $this->get_option( 'merchant_id', '' );
		$this->supabase_url      = $this->get_option( 'supabase_url', 'https://soaxvqkkecqzarwmbeip.supabase.co' );
		$this->supabase_anon_key = $this->get_option( 'supabase_anon_key', '' );
		$this->display_mode      = $this->get_option( 'display_mode', 'all' );

		add_action( 'woocommerce_update_options_shipping_' . $this->id, array( $this, 'process_admin_options' ) );
	}

	public function init_form_fields() {
		$this->instance_form_fields = array(
			'title'            => array(
				'title'       => __( 'Method Title', 'shippingiq' ),
				'type'        => 'text',
				'description' => __( 'Label shown to customers at checkout (e.g. "Freight").', 'shippingiq' ),
				'default'     => 'Freight',
				'desc_tip'    => true,
			),
			'merchant_id'      => array(
				'title'       => __( 'Merchant ID', 'shippingiq' ),
				'type'        => 'text',
				'description' => __( 'Your ShippingIQ merchant UUID. Find it in Supabase → Table Editor → merchants.', 'shippingiq' ),
				'default'     => '',
				'desc_tip'    => true,
			),
			'api_url'          => array(
				'title'       => __( 'Calculate Freight API URL', 'shippingiq' ),
				'type'        => 'text',
				'description' => __( 'The ShippingIQ calculate-freight edge function URL.', 'shippingiq' ),
				'default'     => 'https://soaxvqkkecqzarwmbeip.supabase.co/functions/v1/calculate-freight',
				'desc_tip'    => true,
			),
			'supabase_url'     => array(
				'title'       => __( 'Supabase URL', 'shippingiq' ),
				'type'        => 'text',
				'description' => __( 'Your Supabase project URL, used to fetch carrier eligibility rules.', 'shippingiq' ),
				'default'     => 'https://soaxvqkkecqzarwmbeip.supabase.co',
				'desc_tip'    => true,
			),
			'supabase_anon_key' => array(
				'title'       => __( 'Supabase Anon Key', 'shippingiq' ),
				'type'        => 'password',
				'description' => __( 'Your Supabase anon key, used to fetch carrier eligibility rules. Found in Supabase → Project Settings → API.', 'shippingiq' ),
				'default'     => '',
				'desc_tip'    => true,
			),
			'display_mode'     => array(
				'title'       => __( 'Display Mode', 'shippingiq' ),
				'type'        => 'select',
				'description' => __( 'Controls which carriers are shown at checkout. Priority order is set in ShippingIQ → Rules.', 'shippingiq' ),
				'options'     => array(
					'all'      => __( 'All eligible carriers (sorted by preference)', 'shippingiq' ),
					'cheapest' => __( 'Cheapest carrier only', 'shippingiq' ),
					'priority' => __( 'Preferred carrier only (your top-ranked carrier that services this postcode)', 'shippingiq' ),
				),
				'default'     => 'all',
				'desc_tip'    => true,
			),
		);
	}

	// ---------------------------------------------------------------------------
	// Core rate calculation
	// ---------------------------------------------------------------------------

	public function calculate_shipping( $package = array() ) {
		if ( empty( $this->merchant_id ) || empty( $this->api_url ) ) {
			return;
		}

		$postcode = sanitize_text_field( $package['destination']['postcode'] ?? '' );
		if ( empty( $postcode ) ) {
			return;
		}

		$items = $this->build_items( $package['contents'] );
		if ( empty( $items ) ) {
			return;
		}

		// Fetch eligibility rules and resolve product tag rules before calling the API.
		$eligibility_map                = $this->fetch_carrier_eligibility();
		[ $only_slugs, $exclude_slugs ] = $this->resolve_tag_rules( $package['contents'] );

		$order_value = 0;
		foreach ( $package['contents'] as $item ) {
			$product      = $item['data'];
			$qty          = $item['quantity'];
			$price        = $product ? floatval( $product->get_price() ) : 0;
			$order_value += $price * $qty;
		}

		$has_exempt_item = false;
		foreach ( $package['contents'] as $item ) {
			$product_id = $item['product_id'];
			if ( has_term( 'shippingiq-exempt', 'product_tag', $product_id ) ) {
				$has_exempt_item = true;
				break;
			}
		}

		// Check transient cache before calling the API.
		$cache_key = 'shippingiq_' . md5( $this->merchant_id . $postcode . serialize( $items ) );
		$body      = get_transient( $cache_key );

		if ( false === $body ) {
			$request_payload = array(
				'postcode'      => $postcode,
				'items'         => $items,
				'merchant_id'   => $this->merchant_id,
				'orderValue'    => $order_value,
				'hasExemptItem' => $has_exempt_item,
			);

			$response = wp_remote_post(
				esc_url_raw( $this->api_url ),
				array(
					'headers' => array(
						'Content-Type'  => 'application/json',
						'apikey'        => $this->supabase_anon_key,
						'Authorization' => 'Bearer ' . $this->supabase_anon_key,
					),
					'body'    => wp_json_encode( $request_payload ),
					'timeout' => 20,
				)
			);

			if ( is_wp_error( $response ) ) {
				return;
			}

			$response_code = (int) wp_remote_retrieve_response_code( $response );
			$response_body = wp_remote_retrieve_body( $response );

			if ( 200 !== $response_code ) {
				return;
			}

			$body = json_decode( $response_body, true );
			set_transient( $cache_key, $body, 300 );
		}

		$results          = $body['results'] ?? array();
		$carrier_priority = $body['carrierPriority'] ?? array();

		if ( empty( $results ) ) {
			return;
		}

		$eligible = $this->filter_results( $results, $eligibility_map, $only_slugs, $exclude_slugs, $package['contents'] );

		if ( empty( $eligible ) ) {
			return;
		}

		// If any result has free shipping, filter to free results only before applying display mode.
		$has_free = false;
		foreach ( $eligible as $result ) {
			if ( ! empty( $result['freeShipping'] ) ) {
				$has_free = true;
				break;
			}
		}
		if ( $has_free ) {
			$eligible = array_values( array_filter( $eligible, static function ( $r ) {
				return ! empty( $r['freeShipping'] );
			} ) );
		}

		// Sort by carrier priority order defined in ShippingIQ → Rules.
		if ( ! empty( $carrier_priority ) ) {
			usort( $eligible, static function ( $a, $b ) use ( $carrier_priority ) {
				$pos_a = array_search( $a['carrierId'] ?? '', $carrier_priority, true );
				$pos_b = array_search( $b['carrierId'] ?? '', $carrier_priority, true );
				$pos_a = ( false === $pos_a ) ? PHP_INT_MAX : $pos_a;
				$pos_b = ( false === $pos_b ) ? PHP_INT_MAX : $pos_b;
				return $pos_a <=> $pos_b;
			} );
		}

		// Apply display mode.
		if ( 'cheapest' === $this->display_mode ) {
			usort( $eligible, static function ( $a, $b ) {
				return ( (float) ( $a['totalCost'] ?? $a['freightCost'] ?? 0 ) )
					<=> ( (float) ( $b['totalCost'] ?? $b['freightCost'] ?? 0 ) );
			} );
			$eligible = array( $eligible[0] );
		} elseif ( 'priority' === $this->display_mode ) {
			$eligible = array( $eligible[0] );
		}

		foreach ( $eligible as $result ) {
			// Always use totalCost (ex-GST) from the API. WooCommerce applies tax
			// independently via its own tax settings — never add GST here.
			$cost  = (float) ( $result['totalCost'] ?? $result['freightCost'] ?? 0 );
			$label = $result['carrier'] ?? $this->title;
			if ( ! empty( $result['service'] ) && 'Free Shipping' !== $result['service'] ) {
				$label .= ' — ' . $result['service'];
			}

			$this->add_rate( array(
				'id'    => $this->get_rate_id( $this->name_to_slug( $result['carrier'] ?? '' ) ),
				'label' => $label,
				'cost'  => $cost,
			) );
		}
	}

	// ---------------------------------------------------------------------------
	// Filtering
	// ---------------------------------------------------------------------------

	private function filter_results(
		array $results,
		array $eligibility_map,
		array $only_slugs,
		array $exclude_slugs,
		array $contents
	): array {
		$eligible = array();

		foreach ( $results as $result ) {
			if ( ! empty( $result['error'] ) ) {
				continue;
			}

			$carrier_name = $result['carrier'] ?? '';
			$carrier_slug = $this->name_to_slug( $carrier_name );

			// Product tag: shippingiq-only-[slug] — if any item demands a specific carrier,
			// all others are excluded.
			if ( ! empty( $only_slugs ) && ! in_array( $carrier_slug, $only_slugs, true ) ) {
				continue;
			}

			// Product tag: shippingiq-exclude-[slug]
			if ( in_array( $carrier_slug, $exclude_slugs, true ) ) {
				continue;
			}

			// Eligibility rules: exclude carrier if any single item exceeds its limits.
			if ( isset( $eligibility_map[ $carrier_name ] ) ) {
				if ( $this->cart_exceeds_limits( $contents, $eligibility_map[ $carrier_name ] ) ) {
					continue;
				}
			}

			$eligible[] = $result;
		}

		return $eligible;
	}

	// ---------------------------------------------------------------------------
	// Helpers
	// ---------------------------------------------------------------------------

	/**
	 * Build the items payload from WooCommerce cart contents.
	 * Items without a weight are skipped — freight can't be quoted without it.
	 */
	private function build_items( array $contents ): array {
		$items = array();

		foreach ( $contents as $item ) {
			/** @var WC_Product $product */
			$product = $item['data'];
			$weight  = (float) $product->get_weight();

			if ( $weight <= 0 ) {
				continue;
			}

			$items[] = array(
				'desc'   => $product->get_name(),
				'qty'    => (int) $item['quantity'],
				'weight' => $weight,
				'length' => (float) $product->get_length(),
				'width'  => (float) $product->get_width(),
				'height' => (float) $product->get_height(),
			);
		}

		return $items;
	}

	/**
	 * Fetch carrier eligibility rules from the Supabase REST API.
	 * Returns [ 'Carrier Name' => [ 'maxWeightKg' => 500, ... ], ... ]
	 */
	private function fetch_carrier_eligibility(): array {
		if ( empty( $this->supabase_url ) || empty( $this->supabase_anon_key ) || empty( $this->merchant_id ) ) {
			return array();
		}

		$url = rtrim( $this->supabase_url, '/' )
			. '/rest/v1/carriers'
			. '?merchant_id=eq.' . rawurlencode( $this->merchant_id )
			. '&status=eq.active'
			. '&select=name,eligibility_rules';

		$response = wp_remote_get(
			esc_url_raw( $url ),
			array(
				'headers' => array(
					'apikey'        => $this->supabase_anon_key,
					'Authorization' => 'Bearer ' . $this->supabase_anon_key,
				),
				'timeout' => 10,
			)
		);

		if ( is_wp_error( $response ) || 200 !== (int) wp_remote_retrieve_response_code( $response ) ) {
			return array();
		}

		$rows = json_decode( wp_remote_retrieve_body( $response ), true );
		if ( ! is_array( $rows ) ) {
			return array();
		}

		$map = array();
		foreach ( $rows as $row ) {
			if ( ! empty( $row['name'] ) && ! empty( $row['eligibility_rules'] ) ) {
				$map[ $row['name'] ] = $row['eligibility_rules'];
			}
		}

		return $map;
	}

	/**
	 * Check whether any single cart item exceeds the carrier's limits.
	 * Only checks dimensions/weights that are actually set (> 0).
	 */
	private function cart_exceeds_limits( array $contents, array $rules ): bool {
		foreach ( $contents as $item ) {
			/** @var WC_Product $product */
			$product = $item['data'];

			if ( isset( $rules['maxWeightKg'] ) && (float) $rules['maxWeightKg'] > 0 && (float) $product->get_weight() > (float) $rules['maxWeightKg'] ) {
				return true;
			}
			if ( isset( $rules['maxLengthCm'] ) && (float) $rules['maxLengthCm'] > 0 && (float) $product->get_length() > (float) $rules['maxLengthCm'] ) {
				return true;
			}
			if ( isset( $rules['maxWidthCm'] ) && (float) $rules['maxWidthCm'] > 0 && (float) $product->get_width() > (float) $rules['maxWidthCm'] ) {
				return true;
			}
			if ( isset( $rules['maxHeightCm'] ) && (float) $rules['maxHeightCm'] > 0 && (float) $product->get_height() > (float) $rules['maxHeightCm'] ) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Scan all cart items for ShippingIQ product tags and return two lists:
	 * [ $only_carrier_slugs[], $exclude_carrier_slugs[] ]
	 *
	 * Tags:
	 *   shippingiq-only-[carrier-slug]    — only this carrier may be shown
	 *   shippingiq-exclude-[carrier-slug] — this carrier must be excluded
	 */
	private function resolve_tag_rules( array $contents ): array {
		$only    = array();
		$exclude = array();

		foreach ( $contents as $item ) {
			$terms = wp_get_post_terms( (int) $item['product_id'], 'product_tag', array( 'fields' => 'slugs' ) );
			if ( is_wp_error( $terms ) ) {
				continue;
			}
			foreach ( $terms as $slug ) {
				if ( str_starts_with( $slug, 'shippingiq-only-' ) ) {
					$only[] = substr( $slug, 16 );
				} elseif ( str_starts_with( $slug, 'shippingiq-exclude-' ) ) {
					$exclude[] = substr( $slug, 19 );
				}
			}
		}

		return array( array_unique( $only ), array_unique( $exclude ) );
	}

	/**
	 * Convert a carrier name to a URL-safe slug for rate IDs and tag matching.
	 * "Allied Express" → "allied-express"
	 */
	private function name_to_slug( string $name ): string {
		return strtolower( trim( preg_replace( '/[^a-z0-9]+/i', '-', $name ), '-' ) );
	}
}
