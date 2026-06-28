<?php
/**
 * ShippingIQ Admin — account connection and carrier management pages.
 *
 * Handles:
 *   - Admin menu registration
 *   - Sign-up / log-in / disconnect
 *   - My Carrier tab: list carriers, upload + analyse + save rate cards
 *   - Rules tab: free shipping, display mode
 */

defined( 'ABSPATH' ) || exit;

class ShippingIQ_Admin {

	const OPTION_KEY   = 'shippingiq_merchant_id';
	const SUPABASE_URL = 'https://soaxvqkkecqzarwmbeip.supabase.co';
	const ANON_KEY     = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNvYXh2cWtrZWNxemFyd21iZWlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxNjU1NTEsImV4cCI6MjA5Mjc0MTU1MX0.dWydniFxo4a7T1TkBO6Hrj3ZfO7khjygvHegf3-3Jjw';

	public function __construct() {
		add_action( 'admin_menu', array( $this, 'register_menu' ) );
		add_action( 'admin_init', array( $this, 'handle_form_submission' ) );
		add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_scripts' ) );
		add_action( 'wp_ajax_siq_test_postcode', array( $this, 'ajax_test_postcode' ) );
	}

	// -------------------------------------------------------------------------
	// Menu
	// -------------------------------------------------------------------------

	public function register_menu(): void {
		add_submenu_page(
			'woocommerce',
			__( 'ShippingIQ', 'shippingiq-freight-rates-for-woocommerce' ),
			__( 'ShippingIQ', 'shippingiq-freight-rates-for-woocommerce' ),
			'manage_woocommerce',
			'shippingiq-account',
			array( $this, 'render_page' )
		);
	}

	public function enqueue_scripts( string $hook ): void {
		if ( 'woocommerce_page_shippingiq-account' !== $hook ) {
			return;
		}
		$nonce = wp_create_nonce( 'siq_test_postcode' );
		wp_add_inline_script( 'jquery', '
			var siqTestNonce = ' . wp_json_encode( $nonce ) . ';
			jQuery(function($){
				function siqFileGuard(inputId, errorId) {
					$(document).on("change", "#" + inputId, function() {
						var val = $(this).val().toLowerCase();
						if (val.endsWith(".pdf")) {
							$("#" + errorId).show();
							$(this).val("");
						} else if (val.endsWith(".xls")) {
							$("#siq_xls_error").show();
							$(this).val("");
						} else {
							$("#" + errorId).hide();
							$("#siq_xls_error").hide();
						}
					});
				}
				siqFileGuard("siq_rate_card", "siq_pdf_error_rate");
				siqFileGuard("siq_zone_file", "siq_pdf_error_zone");

				// Test postcode
				$(document).on("click", "#siq_test_postcode_btn", function() {
					var postcode = $("#siq_test_postcode_input").val().trim();
					var $result  = $("#siq_test_postcode_result");
					if (!/^\d{4}$/.test(postcode)) {
						$result.css("color","#cc1818").text("Enter a 4-digit postcode.");
						return;
					}
					$result.css("color","#555").text("Testing…");
					var $btn = $(this).prop("disabled", true);
					$.post(ajaxurl, {
						action:   "siq_test_postcode",
						postcode: postcode,
						nonce:    siqTestNonce
					}, function(r) {
						if (r.success) {
							$result.css("color","#00a32a").html(r.data.replace(/\n/g,"<br>"));
						} else {
							$result.css("color","#cc1818").text(r.data);
						}
						$btn.prop("disabled", false);
					}).fail(function() {
						$result.css("color","#cc1818").text("Request failed. Please try again.");
						$btn.prop("disabled", false);
					});
				});
			});

			function siqAddRangeRow(cid) {
				var tbody = document.getElementById("siq-ranges-body-" + cid);
				if (!tbody) return;
				var tr = document.createElement("tr");
				var fields = [
					{name:"siq_range_from[]", ph:"3000", sz:6, ml:4},
					{name:"siq_range_to[]",   ph:"3999", sz:6, ml:4},
					{name:"siq_range_zone[]", ph:"Zone 1", sz:20, ml:50}
				];
				fields.forEach(function(f) {
					var td = document.createElement("td");
					td.style.padding = "2px 4px";
					var inp = document.createElement("input");
					inp.type = "text"; inp.name = f.name; inp.placeholder = f.ph;
					inp.size = f.sz; inp.maxLength = f.ml;
					td.appendChild(inp); tr.appendChild(td);
				});
				var tdBtn = document.createElement("td");
				tdBtn.style.padding = "2px 4px";
				var btn = document.createElement("button");
				btn.type = "button"; btn.className = "button button-small";
				btn.textContent = "Remove";
				btn.onclick = function() { this.closest("tr").remove(); };
				tdBtn.appendChild(btn); tr.appendChild(tdBtn);
				tbody.appendChild(tr);
			}
		' );
	}

	// -------------------------------------------------------------------------
	// Form dispatch (runs before output via admin_init)
	// -------------------------------------------------------------------------

	public function handle_form_submission(): void {
		if ( ! isset( $_POST['shippingiq_action'] ) ) {
			return;
		}
		if ( ! current_user_can( 'manage_woocommerce' ) ) {
			wp_die( esc_html__( 'You do not have permission to do this.', 'shippingiq-freight-rates-for-woocommerce' ) );
		}

		$action = sanitize_key( $_POST['shippingiq_action'] );

		switch ( $action ) {
			case 'disconnect':
				check_admin_referer( 'shippingiq_disconnect' );
				delete_option( self::OPTION_KEY );
				wp_safe_redirect( $this->page_url( array( 'siq_notice' => 'disconnected' ) ) );
				exit;

			case 'signup':
				check_admin_referer( 'shippingiq_signup' );
				$this->process_signup();
				break;

			case 'login':
				check_admin_referer( 'shippingiq_login' );
				$this->process_login();
				break;

			case 'analyse_carrier':
				check_admin_referer( 'shippingiq_analyse_carrier' );
				$this->process_analyse_carrier();
				break;

			case 'save_carrier':
				check_admin_referer( 'shippingiq_save_carrier' );
				$this->process_save_carrier();
				break;

			case 'cancel_analysis':
				check_admin_referer( 'shippingiq_cancel_analysis' );
				$merchant_id = get_option( self::OPTION_KEY, '' );
				delete_transient( 'siq_analysis_' . $merchant_id );
				wp_safe_redirect( $this->page_url( array( 'siq_tab' => 'carrier' ) ) );
				exit;

			case 'delete_carrier':
				check_admin_referer( 'shippingiq_delete_carrier' );
				$this->process_delete_carrier();
				break;

			case 'toggle_carrier':
				check_admin_referer( 'shippingiq_toggle_carrier' );
				$this->process_toggle_carrier();
				break;

			case 'save_rules':
				check_admin_referer( 'shippingiq_save_rules' );
				$this->process_save_rules();
				break;

			case 'save_ranges':
				check_admin_referer( 'shippingiq_save_ranges' );
				$this->process_save_ranges();
				break;
		}
	}

	// -------------------------------------------------------------------------
	// Sign-up
	// -------------------------------------------------------------------------

	private function process_signup(): void {
		$email    = sanitize_email( $_POST['siq_email'] ?? '' );
		$password = $_POST['siq_password'] ?? '';

		if ( ! is_email( $email ) || empty( $password ) ) {
			$this->redirect_with_error( 'signup', __( 'Please enter a valid email and password.', 'shippingiq-freight-rates-for-woocommerce' ) );
			return;
		}

		$response = wp_remote_post(
			self::SUPABASE_URL . '/functions/v1/register-merchant',
			array(
				'headers' => array(
					'Content-Type'  => 'application/json',
					'Authorization' => 'Bearer ' . self::ANON_KEY,
				),
				'body'    => wp_json_encode( array( 'email' => $email, 'password' => $password ) ),
				'timeout' => 20,
			)
		);

		$error = $this->check_response( $response );
		if ( $error ) {
			$this->redirect_with_error( 'signup', $error );
			return;
		}

		$body        = json_decode( wp_remote_retrieve_body( $response ), true );
		$merchant_id = $body['merchant_id'] ?? '';

		if ( empty( $merchant_id ) ) {
			$this->redirect_with_error( 'signup', __( 'Signup succeeded but no merchant ID was returned. Please contact support.', 'shippingiq-freight-rates-for-woocommerce' ) );
			return;
		}

		update_option( self::OPTION_KEY, sanitize_text_field( $merchant_id ) );
		update_option( 'shippingiq_api_key', self::ANON_KEY );
		$this->fire_demo_carrier( $merchant_id );
		wp_safe_redirect( $this->page_url( array( 'siq_notice' => 'connected', 'siq_tab' => 'carrier' ) ) );
		exit;
	}

	// -------------------------------------------------------------------------
	// Log in
	// -------------------------------------------------------------------------

	private function process_login(): void {
		$email    = sanitize_email( $_POST['siq_email'] ?? '' );
		$password = $_POST['siq_password'] ?? '';

		if ( ! is_email( $email ) || empty( $password ) ) {
			$this->redirect_with_error( 'login', __( 'Please enter a valid email and password.', 'shippingiq-freight-rates-for-woocommerce' ) );
			return;
		}

		// Step 1: authenticate.
		$auth_response = wp_remote_post(
			self::SUPABASE_URL . '/auth/v1/token?grant_type=password',
			array(
				'headers' => array(
					'Content-Type'  => 'application/json',
					'apikey'        => self::ANON_KEY,
					'Authorization' => 'Bearer ' . self::ANON_KEY,
				),
				'body'    => wp_json_encode( array( 'email' => $email, 'password' => $password ) ),
				'timeout' => 20,
			)
		);

		$error = $this->check_response( $auth_response );
		if ( $error ) {
			$this->redirect_with_error( 'login', $error );
			return;
		}

		$auth_body    = json_decode( wp_remote_retrieve_body( $auth_response ), true );
		$access_token = $auth_body['access_token'] ?? '';

		if ( empty( $access_token ) ) {
			$this->redirect_with_error( 'login', __( 'Login failed: could not retrieve access token.', 'shippingiq-freight-rates-for-woocommerce' ) );
			return;
		}

		// Step 2: fetch merchant_id.
		$merchant_response = wp_remote_post(
			self::SUPABASE_URL . '/functions/v1/get-merchant-id',
			array(
				'headers' => array(
					'Content-Type'  => 'application/json',
					'Authorization' => 'Bearer ' . $access_token,
				),
				'timeout' => 10,
			)
		);

		$error = $this->check_response( $merchant_response );
		if ( $error ) {
			$this->redirect_with_error( 'login', $error );
			return;
		}

		$merchant_body = json_decode( wp_remote_retrieve_body( $merchant_response ), true );
		$merchant_id   = $merchant_body['merchant_id'] ?? '';

		if ( empty( $merchant_id ) ) {
			$this->redirect_with_error( 'login', __( 'Login succeeded but no merchant record was found. Please contact support.', 'shippingiq-freight-rates-for-woocommerce' ) );
			return;
		}

		update_option( self::OPTION_KEY, sanitize_text_field( $merchant_id ) );
		update_option( 'shippingiq_api_key', self::ANON_KEY );
		$this->fire_demo_carrier( $merchant_id );
		wp_safe_redirect( $this->page_url( array( 'siq_notice' => 'connected', 'siq_tab' => 'carrier' ) ) );
		exit;
	}

	// -------------------------------------------------------------------------
	// Demo carrier — fire and forget after login/signup
	// -------------------------------------------------------------------------

	private function fire_demo_carrier( string $merchant_id ): void {
		wp_remote_post(
			self::SUPABASE_URL . '/functions/v1/create-demo-carrier',
			array(
				'headers'  => array(
					'Content-Type'  => 'application/json',
					'Authorization' => 'Bearer ' . self::ANON_KEY,
					'apikey'        => self::ANON_KEY,
				),
				'body'     => wp_json_encode( array( 'merchant_id' => $merchant_id ) ),
				'timeout'  => 0.01,
				'blocking' => false,
			)
		);
	}

	// -------------------------------------------------------------------------
	// Analyse carrier (file upload → rapid-api)
	// -------------------------------------------------------------------------

	private function process_analyse_carrier(): void {
		$merchant_id  = get_option( self::OPTION_KEY, '' );
		$carrier_name = sanitize_text_field( $_POST['siq_carrier_name'] ?? '' );

		if ( empty( $merchant_id ) || empty( $carrier_name ) ) {
			$this->redirect_with_error_tab( 'carrier', __( 'Carrier name is required.', 'shippingiq-freight-rates-for-woocommerce' ) );
			return;
		}

		// Validate and read rate card file.
		$rate_card_file = $_FILES['siq_rate_card'] ?? null;
		if ( empty( $rate_card_file['tmp_name'] ) || UPLOAD_ERR_OK !== (int) $rate_card_file['error'] ) {
			$this->redirect_with_error_tab( 'carrier', __( 'Rate card file is required.', 'shippingiq-freight-rates-for-woocommerce' ) );
			return;
		}
		$rate_ext = strtolower( pathinfo( $rate_card_file['name'], PATHINFO_EXTENSION ) );
		if ( ! in_array( $rate_ext, array( 'csv', 'xlsx', 'xls' ), true ) ) {
			$this->redirect_with_error_tab( 'carrier', __( 'Rate card must be a CSV or Excel file (.csv, .xlsx, .xls).', 'shippingiq-freight-rates-for-woocommerce' ) );
			return;
		}
		if ( 'pdf' === $rate_ext ) {
			$this->redirect_with_error_tab( 'carrier', __( 'PDF upload is a Pro feature. Convert your PDF rate card at shippingiq.com.au/pricing', 'shippingiq-freight-rates-for-woocommerce' ) );
			return;
		}

		// Validate and read zone file (optional but recommended).
		$zone_file     = $_FILES['siq_zone_file'] ?? null;
		$zone_ext      = '';
		$zone_bytes    = '';
		if ( ! empty( $zone_file['tmp_name'] ) && UPLOAD_ERR_OK === (int) $zone_file['error'] ) {
			$zone_ext = strtolower( pathinfo( $zone_file['name'], PATHINFO_EXTENSION ) );
			if ( ! in_array( $zone_ext, array( 'csv', 'xlsx', 'xls' ), true ) ) {
				$this->redirect_with_error_tab( 'carrier', __( 'Zone file must be a CSV or Excel file.', 'shippingiq-freight-rates-for-woocommerce' ) );
				return;
			}
			$zone_bytes = (string) file_get_contents( $zone_file['tmp_name'] );
		}

		// Convert rate card to text for rapid-api.
		$rate_bytes = (string) file_get_contents( $rate_card_file['tmp_name'] );
		$rate_text  = $this->file_bytes_to_text( $rate_bytes, $rate_ext );
		if ( strlen( $rate_text ) > 8000 ) {
			$rate_text = substr( $rate_text, 0, 8000 );
		}

		// Call rapid-api mode: 'rates'.
		$api_response = wp_remote_post(
			self::SUPABASE_URL . '/functions/v1/rapid-api',
			array(
				'headers' => array(
					'Content-Type'  => 'application/json',
					'Authorization' => 'Bearer ' . self::ANON_KEY,
					'apikey'        => self::ANON_KEY,
				),
				'body'    => wp_json_encode( array(
					'mode'        => 'rates',
					'carrierName' => $carrier_name,
					'rateText'    => $rate_text,
					'pdfs'        => array(),
				) ),
				'timeout' => 60,
			)
		);

		$error = $this->check_response( $api_response );
		if ( $error ) {
			$this->redirect_with_error_tab( 'carrier', __( 'Analysis failed: ', 'shippingiq-freight-rates-for-woocommerce' ) . $error );
			return;
		}

		$structure = json_decode( wp_remote_retrieve_body( $api_response ), true );
		if ( empty( $structure['pricingModel'] ) ) {
			$this->redirect_with_error_tab( 'carrier', __( 'Analysis returned an unexpected result. Please try again.', 'shippingiq-freight-rates-for-woocommerce' ) );
			return;
		}

		// Build postcodeMap from zone file now (store bytes for later use in save).
		$postcode_map = array();
		if ( ! empty( $zone_bytes ) && ! empty( $zone_ext ) ) {
			$postcode_map = $this->build_postcode_map( $zone_bytes, $zone_ext );
		}

		// Store analysis data in a transient for the Save step.
		$transient_key  = 'siq_analysis_' . $merchant_id;
		$transient_data = array(
			'carrier_name'   => $carrier_name,
			'structure'      => $structure,
			'rate_text'      => $rate_text,
			'rate_ext'       => $rate_ext,
			'postcode_map'   => $postcode_map,
		);
		set_transient( $transient_key, $transient_data, 30 * MINUTE_IN_SECONDS );

		wp_safe_redirect( $this->page_url( array( 'siq_tab' => 'carrier', 'siq_state' => 'analyzed' ) ) );
		exit;
	}

	// -------------------------------------------------------------------------
	// Save carrier (build modelBRates + surcharges → INSERT to Supabase)
	// -------------------------------------------------------------------------

	private function process_save_carrier(): void {
		$merchant_id   = get_option( self::OPTION_KEY, '' );
		$transient_key = 'siq_analysis_' . $merchant_id;
		$data          = get_transient( $transient_key );

		if ( empty( $data ) || empty( $data['structure'] ) ) {
			$this->redirect_with_error_tab( 'carrier', __( 'Analysis data expired. Please analyse your files again.', 'shippingiq-freight-rates-for-woocommerce' ) );
			return;
		}

		$carrier_name = $data['carrier_name'];
		$structure    = $data['structure'];
		$rate_text    = $data['rate_text'];
		$postcode_map = $data['postcode_map'] ?? array();

		// Call rapid-api mode: 'surcharges'.
		$surcharge_response = wp_remote_post(
			self::SUPABASE_URL . '/functions/v1/rapid-api',
			array(
				'headers' => array(
					'Content-Type'  => 'application/json',
					'Authorization' => 'Bearer ' . self::ANON_KEY,
					'apikey'        => self::ANON_KEY,
				),
				'body'    => wp_json_encode( array(
					'mode'          => 'surcharges',
					'carrierName'   => $carrier_name,
					'surchargeText' => $rate_text,
					'pdfs'          => array(),
				) ),
				'timeout' => 60,
			)
		);

		$surcharges = array();
		if ( ! is_wp_error( $surcharge_response ) && 200 === (int) wp_remote_retrieve_response_code( $surcharge_response ) ) {
			$surcharge_body = json_decode( wp_remote_retrieve_body( $surcharge_response ), true );
			$surcharges     = $surcharge_body['surcharges'] ?? array();
		}

		// Build rates arrays for the pricing model.
		$model        = $structure['pricingModel'] ?? 'B';
		$model_b_rates = array();
		$model_c_rates = array();

		if ( 'B' === $model ) {
			$column_map   = $structure['columnMap'] ?? array();
			$zone_code_col = $structure['zoneCodeCol'] ?? '';
			$zone_name_col = $structure['zoneNameCol'] ?? '';
			if ( ! empty( $column_map ) ) {
				$model_b_rates = $this->build_model_b_rates( $rate_text, $column_map, $zone_code_col, $zone_name_col );
			}
		} elseif ( 'C' === $model ) {
			if ( ! empty( $structure['modelCRates'] ) ) {
				$model_c_rates = $structure['modelCRates'];
			} else {
				$model_c_rates = $this->build_model_c_rates( $rate_text );
			}
		}

		// Assemble parsed_data.
		$parsed_data = array_merge( $structure, array(
			'postcodeMap'   => $postcode_map,
			'modelBRates'   => $model_b_rates,
			'modelCRates'   => $model_c_rates,
			'surcharges'    => $surcharges,
		) );

		// INSERT carrier via Supabase REST API.
		$anon_key = get_option( 'shippingiq_api_key', self::ANON_KEY );
		$insert_response = wp_remote_post(
			self::SUPABASE_URL . '/rest/v1/carriers',
			array(
				'headers' => array(
					'Content-Type'  => 'application/json',
					'apikey'        => $anon_key,
					'Authorization' => 'Bearer ' . $anon_key,
					'Prefer'        => 'return=minimal',
				),
				'body'    => wp_json_encode( array(
					'name'             => $carrier_name,
					'merchant_id'      => $merchant_id,
					'status'           => 'active',
					'is_demo'          => false,
					'parsed_data'      => $parsed_data,
					'fuel_levy_pct'    => 0,
					'eligibility_rules' => array( 'maxWeightKg' => 0, 'maxLengthCm' => 0, 'maxWidthCm' => 0, 'maxHeightCm' => 0 ),
					'surcharge_rules'  => (object) array(),
				) ),
				'timeout' => 20,
			)
		);

		if ( is_wp_error( $insert_response ) ) {
			$this->redirect_with_error_tab( 'carrier', $insert_response->get_error_message() );
			return;
		}
		$insert_code = (int) wp_remote_retrieve_response_code( $insert_response );
		if ( $insert_code < 200 || $insert_code >= 300 ) {
			$body = json_decode( wp_remote_retrieve_body( $insert_response ), true );
			$msg  = $body['message'] ?? $body['error'] ?? __( 'Save failed. Please try again.', 'shippingiq-freight-rates-for-woocommerce' );
			$this->redirect_with_error_tab( 'carrier', $msg );
			return;
		}

		delete_transient( $transient_key );
		wp_safe_redirect( $this->page_url( array( 'siq_tab' => 'carrier', 'siq_notice' => 'carrier_saved' ) ) );
		exit;
	}

	// -------------------------------------------------------------------------
	// Delete carrier
	// -------------------------------------------------------------------------

	private function process_delete_carrier(): void {
		$merchant_id = get_option( self::OPTION_KEY, '' );
		$carrier_id  = sanitize_text_field( $_POST['siq_carrier_id'] ?? '' );

		if ( empty( $carrier_id ) ) {
			$this->redirect_with_error_tab( 'carrier', __( 'Invalid carrier.', 'shippingiq-freight-rates-for-woocommerce' ) );
			return;
		}

		$anon_key = get_option( 'shippingiq_api_key', self::ANON_KEY );
		$url      = self::SUPABASE_URL . '/rest/v1/carriers?id=eq.' . rawurlencode( $carrier_id ) . '&merchant_id=eq.' . rawurlencode( $merchant_id );

		$response = wp_remote_request( esc_url_raw( $url ), array(
			'method'  => 'DELETE',
			'headers' => array(
				'apikey'        => $anon_key,
				'Authorization' => 'Bearer ' . $anon_key,
			),
			'timeout' => 10,
		) );

		if ( is_wp_error( $response ) ) {
			$this->redirect_with_error_tab( 'carrier', $response->get_error_message() );
			return;
		}

		wp_safe_redirect( $this->page_url( array( 'siq_tab' => 'carrier', 'siq_notice' => 'carrier_deleted' ) ) );
		exit;
	}

	// -------------------------------------------------------------------------
	// Toggle carrier active/inactive
	// -------------------------------------------------------------------------

	private function process_toggle_carrier(): void {
		$merchant_id = get_option( self::OPTION_KEY, '' );
		$carrier_id  = sanitize_text_field( $_POST['siq_carrier_id'] ?? '' );
		$new_status  = sanitize_key( $_POST['siq_new_status'] ?? '' );

		if ( empty( $carrier_id ) || ! in_array( $new_status, array( 'active', 'inactive' ), true ) ) {
			$this->redirect_with_error_tab( 'carrier', __( 'Invalid request.', 'shippingiq-freight-rates-for-woocommerce' ) );
			return;
		}

		$anon_key = get_option( 'shippingiq_api_key', self::ANON_KEY );
		$url      = self::SUPABASE_URL . '/rest/v1/carriers?id=eq.' . rawurlencode( $carrier_id ) . '&merchant_id=eq.' . rawurlencode( $merchant_id );

		wp_remote_request( esc_url_raw( $url ), array(
			'method'  => 'PATCH',
			'headers' => array(
				'Content-Type'  => 'application/json',
				'apikey'        => $anon_key,
				'Authorization' => 'Bearer ' . $anon_key,
				'Prefer'        => 'return=minimal',
			),
			'body'    => wp_json_encode( array( 'status' => $new_status ) ),
			'timeout' => 10,
		) );

		wp_safe_redirect( $this->page_url( array( 'siq_tab' => 'carrier' ) ) );
		exit;
	}

	// -------------------------------------------------------------------------
	// Save postcode ranges
	// -------------------------------------------------------------------------

	private function process_save_ranges(): void {
		$merchant_id = get_option( self::OPTION_KEY, '' );
		$carrier_id  = sanitize_text_field( $_POST['siq_carrier_id'] ?? '' );

		if ( empty( $carrier_id ) ) {
			$this->redirect_with_error_tab( 'carrier', __( 'Invalid carrier.', 'shippingiq-freight-rates-for-woocommerce' ) );
			return;
		}

		$froms = array_map( 'sanitize_text_field', (array) ( $_POST['siq_range_from'] ?? array() ) );
		$tos   = array_map( 'sanitize_text_field', (array) ( $_POST['siq_range_to'] ?? array() ) );
		$zones = array_map( 'sanitize_text_field', (array) ( $_POST['siq_range_zone'] ?? array() ) );

		$manual_ranges = array();
		$postcode_map  = array();
		$seen          = array();
		$count         = min( count( $froms ), count( $tos ), count( $zones ) );

		for ( $i = 0; $i < $count; $i++ ) {
			$from_pc = intval( $froms[ $i ] );
			$to_pc   = intval( $tos[ $i ] );
			$zone    = trim( $zones[ $i ] );

			if ( $from_pc < 200 || $to_pc < $from_pc || '' === $zone ) {
				continue;
			}
			if ( $to_pc - $from_pc > 5000 ) {
				$to_pc = $from_pc + 5000;
			}

			$manual_ranges[] = array( 'from' => $from_pc, 'to' => $to_pc, 'zone' => $zone );

			for ( $p = $from_pc; $p <= $to_pc; $p++ ) {
				$key = str_pad( (string) $p, 4, '0', STR_PAD_LEFT );
				if ( ! isset( $seen[ $key ] ) ) {
					$seen[ $key ]   = true;
					$postcode_map[] = array(
						'postcode' => $key,
						'zoneCode' => $zone,
						'zone'     => $zone,
						'state'    => '',
						'suburb'   => '',
					);
				}
			}
		}

		$existing = $this->fetch_carrier_parsed_data( $carrier_id, $merchant_id );
		$merged   = array_merge( $existing, array(
			'postcodeMap'          => $postcode_map,
			'manualPostcodeRanges' => $manual_ranges,
		) );

		$anon_key = get_option( 'shippingiq_api_key', self::ANON_KEY );
		$url      = self::SUPABASE_URL . '/rest/v1/carriers?id=eq.' . rawurlencode( $carrier_id ) . '&merchant_id=eq.' . rawurlencode( $merchant_id );

		$response = wp_remote_request( esc_url_raw( $url ), array(
			'method'  => 'PATCH',
			'headers' => array(
				'Content-Type'  => 'application/json',
				'apikey'        => $anon_key,
				'Authorization' => 'Bearer ' . $anon_key,
				'Prefer'        => 'return=minimal',
			),
			'body'    => wp_json_encode( array( 'parsed_data' => $merged ) ),
			'timeout' => 15,
		) );

		if ( is_wp_error( $response ) ) {
			$this->redirect_with_error_tab( 'carrier', $response->get_error_message() );
			return;
		}

		wp_safe_redirect( $this->page_url( array(
			'siq_tab'           => 'carrier',
			'siq_notice'        => 'ranges_saved',
			'siq_expand_ranges' => $carrier_id,
		) ) );
		exit;
	}

	private function fetch_carrier_parsed_data( string $carrier_id, string $merchant_id ): array {
		$anon_key = get_option( 'shippingiq_api_key', self::ANON_KEY );
		$url      = self::SUPABASE_URL . '/rest/v1/carriers'
			. '?id=eq.' . rawurlencode( $carrier_id )
			. '&merchant_id=eq.' . rawurlencode( $merchant_id )
			. '&select=parsed_data';

		$response = wp_remote_get( esc_url_raw( $url ), array(
			'headers' => array(
				'apikey'        => $anon_key,
				'Authorization' => 'Bearer ' . $anon_key,
				'Accept'        => 'application/vnd.pgrst.object+json',
			),
			'timeout' => 10,
		) );

		if ( is_wp_error( $response ) || 200 !== (int) wp_remote_retrieve_response_code( $response ) ) {
			return array();
		}

		$body = json_decode( wp_remote_retrieve_body( $response ), true );
		return is_array( $body['parsed_data'] ?? null ) ? $body['parsed_data'] : array();
	}

	// -------------------------------------------------------------------------
	// AJAX: test postcode
	// -------------------------------------------------------------------------

	public function ajax_test_postcode(): void {
		check_ajax_referer( 'siq_test_postcode', 'nonce' );

		if ( ! current_user_can( 'manage_woocommerce' ) ) {
			wp_send_json_error( 'Unauthorized.' );
		}

		$postcode    = sanitize_text_field( $_POST['postcode'] ?? '' );
		$merchant_id = get_option( self::OPTION_KEY, '' );

		if ( ! preg_match( '/^\d{4}$/', $postcode ) ) {
			wp_send_json_error( __( 'Enter a valid 4-digit postcode.', 'shippingiq-freight-rates-for-woocommerce' ) );
		}

		$response = wp_remote_post(
			self::SUPABASE_URL . '/functions/v1/calculate-freight',
			array(
				'headers' => array(
					'Content-Type'  => 'application/json',
					'Authorization' => 'Bearer ' . self::ANON_KEY,
					'apikey'        => self::ANON_KEY,
				),
				'body'    => wp_json_encode( array(
					'postcode'    => $postcode,
					'merchant_id' => $merchant_id,
					'orderValue'  => 100,
					'items'       => array( array(
						'weight' => 1,
						'length' => 30,
						'width'  => 20,
						'height' => 10,
						'qty'    => 1,
					) ),
				) ),
				'timeout' => 15,
			)
		);

		if ( is_wp_error( $response ) ) {
			wp_send_json_error( $response->get_error_message() );
		}

		$body    = json_decode( wp_remote_retrieve_body( $response ), true );
		$results = $body['results'] ?? array();

		if ( ! empty( $body['error'] ) ) {
			$err_map = array(
				'no_active_carriers'  => __( 'No active carriers.', 'shippingiq-freight-rates-for-woocommerce' ),
				'postcode_not_found'  => __( 'Postcode not covered — check your zone file or postcode ranges.', 'shippingiq-freight-rates-for-woocommerce' ),
				'no_zone_file'        => __( 'No zone file — add postcode ranges first.', 'shippingiq-freight-rates-for-woocommerce' ),
				'quote_limit_reached' => __( 'Monthly quote limit reached.', 'shippingiq-freight-rates-for-woocommerce' ),
			);
			$msg = $err_map[ $body['error'] ] ?? esc_html( $body['error'] );
			wp_send_json_error( $msg );
		}

		if ( empty( $results ) ) {
			wp_send_json_error( __( 'No rates returned for this postcode.', 'shippingiq-freight-rates-for-woocommerce' ) );
		}

		$lines = array();
		foreach ( $results as $r ) {
			if ( ! empty( $r['error'] ) ) {
				$lines[] = ( $r['carrierName'] ?? 'Unknown' ) . ': ' . $r['error'];
				continue;
			}
			$name    = ( $r['carrierName'] ?? 'Unknown' ) . ' — ' . ( $r['service'] ?? 'Standard' );
			$total   = floatval( $r['totalCost'] ?? 0 );
			$lines[] = $name . ': ' . ( $total > 0 ? '$' . number_format( $total, 2 ) : 'FREE' );
		}

		wp_send_json_success( implode( "\n", $lines ) );
	}

	// -------------------------------------------------------------------------
	// Save rules
	// -------------------------------------------------------------------------

	private function process_save_rules(): void {
		$merchant_id = get_option( self::OPTION_KEY, '' );

		$free_shipping_enabled   = ! empty( $_POST['siq_free_shipping_enabled'] );
		$free_shipping_threshold = floatval( $_POST['siq_free_shipping_threshold'] ?? 0 );
		$free_shipping_mode      = sanitize_key( $_POST['siq_free_shipping_mode'] ?? 'smart' );
		$display_mode            = sanitize_key( $_POST['siq_display_mode'] ?? 'all' );

		if ( ! in_array( $free_shipping_mode, array( 'smart', 'true' ), true ) ) {
			$free_shipping_mode = 'smart';
		}
		if ( ! in_array( $display_mode, array( 'all', 'cheapest', 'priority' ), true ) ) {
			$display_mode = 'all';
		}

		// Fetch current rules so we don't overwrite fields we don't own (e.g. carrierPriority, margin).
		$current_rules = $this->fetch_merchant_rules( $merchant_id );

		$new_rules = array_merge( $current_rules, array(
			'freeShippingEnabled'   => $free_shipping_enabled,
			'freeShippingThreshold' => $free_shipping_threshold,
			'freeShippingMode'      => $free_shipping_mode,
			'displayMode'           => $display_mode,
		) );

		$anon_key = get_option( 'shippingiq_api_key', self::ANON_KEY );
		$url      = self::SUPABASE_URL . '/rest/v1/merchants?id=eq.' . rawurlencode( $merchant_id );

		$response = wp_remote_request( esc_url_raw( $url ), array(
			'method'  => 'PATCH',
			'headers' => array(
				'Content-Type'  => 'application/json',
				'apikey'        => $anon_key,
				'Authorization' => 'Bearer ' . $anon_key,
				'Prefer'        => 'return=minimal',
			),
			'body'    => wp_json_encode( array( 'rules' => $new_rules ) ),
			'timeout' => 10,
		) );

		if ( is_wp_error( $response ) ) {
			$this->redirect_with_error_tab( 'rules', $response->get_error_message() );
			return;
		}

		// Also update the WP display_mode option so the shipping method picks it up immediately.
		update_option( 'shippingiq_display_mode', $display_mode );

		wp_safe_redirect( $this->page_url( array( 'siq_tab' => 'rules', 'siq_notice' => 'rules_saved' ) ) );
		exit;
	}

	// -------------------------------------------------------------------------
	// Supabase data fetching
	// -------------------------------------------------------------------------

	private function fetch_carriers( string $merchant_id ): array {
		$anon_key = get_option( 'shippingiq_api_key', self::ANON_KEY );
		$url      = self::SUPABASE_URL . '/rest/v1/carriers'
			. '?merchant_id=eq.' . rawurlencode( $merchant_id )
			. '&select=id,name,status,is_demo'
			. '&order=created_at.asc';

		$response = wp_remote_get( esc_url_raw( $url ), array(
			'headers' => array(
				'apikey'        => $anon_key,
				'Authorization' => 'Bearer ' . $anon_key,
			),
			'timeout' => 10,
		) );

		if ( is_wp_error( $response ) || 200 !== (int) wp_remote_retrieve_response_code( $response ) ) {
			return array();
		}

		return json_decode( wp_remote_retrieve_body( $response ), true ) ?: array();
	}

	private function fetch_real_carriers_parsed_data( string $merchant_id ): array {
		$anon_key = get_option( 'shippingiq_api_key', self::ANON_KEY );
		$url      = self::SUPABASE_URL . '/rest/v1/carriers'
			. '?merchant_id=eq.' . rawurlencode( $merchant_id )
			. '&is_demo=eq.false'
			. '&select=id,parsed_data';

		$response = wp_remote_get( esc_url_raw( $url ), array(
			'headers' => array(
				'apikey'        => $anon_key,
				'Authorization' => 'Bearer ' . $anon_key,
			),
			'timeout' => 10,
		) );

		if ( is_wp_error( $response ) || 200 !== (int) wp_remote_retrieve_response_code( $response ) ) {
			return array();
		}

		$rows = json_decode( wp_remote_retrieve_body( $response ), true );
		if ( ! is_array( $rows ) ) {
			return array();
		}

		$map = array();
		foreach ( $rows as $row ) {
			if ( ! empty( $row['id'] ) && is_array( $row['parsed_data'] ?? null ) ) {
				$map[ $row['id'] ] = $row['parsed_data'];
			}
		}
		return $map;
	}

	private function fetch_merchant_rules( string $merchant_id ): array {
		$anon_key = get_option( 'shippingiq_api_key', self::ANON_KEY );
		$url      = self::SUPABASE_URL . '/rest/v1/merchants'
			. '?id=eq.' . rawurlencode( $merchant_id )
			. '&select=rules';

		$response = wp_remote_get( esc_url_raw( $url ), array(
			'headers' => array(
				'apikey'        => $anon_key,
				'Authorization' => 'Bearer ' . $anon_key,
				'Accept'        => 'application/vnd.pgrst.object+json',
			),
			'timeout' => 10,
		) );

		if ( is_wp_error( $response ) || 200 !== (int) wp_remote_retrieve_response_code( $response ) ) {
			return array();
		}

		$body = json_decode( wp_remote_retrieve_body( $response ), true );
		return is_array( $body['rules'] ?? null ) ? $body['rules'] : array();
	}

	// -------------------------------------------------------------------------
	// Zone file → postcodeMap
	// -------------------------------------------------------------------------

	private function build_postcode_map( string $bytes, string $ext ): array {
		if ( 'csv' === $ext ) {
			return $this->parse_rows_to_postcode_map( $this->csv_bytes_to_rows( $bytes ) );
		}
		if ( 'xlsx' === $ext ) {
			return $this->parse_rows_to_postcode_map( $this->xlsx_to_rows( $bytes ) );
		}
		return array();
	}

	private function csv_bytes_to_rows( string $bytes ): array {
		$rows   = array();
		$handle = fopen( 'php://memory', 'r+' );
		fwrite( $handle, $bytes );
		rewind( $handle );
		while ( ( $row = fgetcsv( $handle ) ) !== false ) {
			$rows[] = $row;
		}
		fclose( $handle );
		return $rows;
	}

	private function xlsx_to_rows( string $bytes ): array {
		if ( ! class_exists( 'ZipArchive' ) ) {
			return array();
		}

		$tmp_path = wp_tempnam( 'siq_xlsx_' );
		file_put_contents( $tmp_path, $bytes );

		$zip = new ZipArchive();
		if ( true !== $zip->open( $tmp_path ) ) {
			@unlink( $tmp_path );
			return array();
		}

		// Read shared strings.
		$shared_strings = array();
		$ss_xml         = $zip->getFromName( 'xl/sharedStrings.xml' );
		if ( $ss_xml ) {
			$ss = @simplexml_load_string( $ss_xml );
			if ( $ss ) {
				foreach ( $ss->si as $si ) {
					if ( isset( $si->t ) ) {
						$shared_strings[] = (string) $si->t;
					} else {
						$t = '';
						foreach ( $si->r as $r ) {
							$t .= (string) $r->t;
						}
						$shared_strings[] = $t;
					}
				}
			}
		}

		// Read first available sheet.
		$sheet_xml = false;
		for ( $s = 1; $s <= 5; $s++ ) {
			$content = $zip->getFromName( "xl/worksheets/sheet{$s}.xml" );
			if ( $content ) {
				$sheet_xml = $content;
				break;
			}
		}
		$zip->close();
		@unlink( $tmp_path );

		if ( ! $sheet_xml ) {
			return array();
		}

		$sheet = @simplexml_load_string( $sheet_xml );
		if ( ! $sheet || ! isset( $sheet->sheetData->row ) ) {
			return array();
		}

		$rows_sparse = array();
		foreach ( $sheet->sheetData->row as $row_el ) {
			$row_idx  = (int) $row_el['r'] - 1;
			$cell_map = array();
			foreach ( $row_el->c as $cell ) {
				$ref = (string) $cell['r'];
				if ( ! preg_match( '/^([A-Z]+)/', $ref, $m ) ) {
					continue;
				}
				$col_idx  = $this->xlsx_col_to_index( $m[1] );
				$type     = (string) $cell['t'];
				$val_raw  = (string) $cell->v;
				if ( 's' === $type ) {
					$value = $shared_strings[ (int) $val_raw ] ?? '';
				} elseif ( 'b' === $type ) {
					$value = $val_raw ? 'TRUE' : 'FALSE';
				} else {
					$value = $val_raw;
				}
				$cell_map[ $col_idx ] = $value;
			}
			if ( ! empty( $cell_map ) ) {
				$rows_sparse[ $row_idx ] = $cell_map;
			}
		}

		// Normalise sparse rows into sequential indexed arrays (ksort preserves row order).
		ksort( $rows_sparse );
		$rows = array();
		foreach ( $rows_sparse as $cell_map ) {
			$max_col = max( array_keys( $cell_map ) );
			$row_arr = array();
			for ( $c = 0; $c <= $max_col; $c++ ) {
				$row_arr[] = $cell_map[ $c ] ?? '';
			}
			$rows[] = $row_arr;
		}
		return $rows;
	}

	private function xlsx_col_to_index( string $col ): int {
		$col = strtoupper( trim( $col ) );
		$idx = 0;
		for ( $i = 0; $i < strlen( $col ); $i++ ) {
			$idx = $idx * 26 + ( ord( $col[ $i ] ) - ord( 'A' ) + 1 );
		}
		return $idx - 1;
	}

	/**
	 * Parse rows (arrays) into postcodeMap entries.
	 * Scans up to row 30 to find the header row.
	 */
	private function parse_rows_to_postcode_map( array $rows ): array {
		if ( empty( $rows ) ) {
			return array();
		}

		$postcode_keywords = array( 'postcode', 'post_code', 'post code', 'pcode', 'postal code', 'zip' );
		$zone_keywords     = array( 'zone', 'zone name', 'zone_name', 'zonename', 'ratinglocation', 'rating location', 'rating_location', 'service area', 'depot' );
		$state_keywords    = array( 'state', 'state_code', 'st' );
		$suburb_keywords   = array( 'suburb', 'suburb name', 'locality', 'city', 'town', 'location' );

		$header     = null;
		$header_idx = 0;

		$limit = min( 30, count( $rows ) );
		for ( $i = 0; $i < $limit; $i++ ) {
			$lower_row = array_map( 'strtolower', array_map( 'trim', $rows[ $i ] ) );
			$found_pc  = false;
			foreach ( $lower_row as $cell ) {
				if ( in_array( $cell, $postcode_keywords, true ) ) {
					$found_pc = true;
					break;
				}
			}
			if ( $found_pc ) {
				$header     = $lower_row;
				$header_idx = $i;
				break;
			}
		}

		if ( null === $header ) {
			return array();
		}

		$pc_col     = $this->find_col( $header, $postcode_keywords );
		$zone_col   = $this->find_col( $header, $zone_keywords );
		$state_col  = $this->find_col( $header, $state_keywords );
		$suburb_col = $this->find_col( $header, $suburb_keywords );

		if ( $pc_col < 0 || $zone_col < 0 ) {
			return array();
		}

		$postcode_map = array();
		$seen         = array();

		for ( $i = $header_idx + 1; $i < count( $rows ); $i++ ) {
			$row        = $rows[ $i ];
			$pc_raw     = trim( $row[ $pc_col ] ?? '' );
			$zone_val   = trim( $row[ $zone_col ] ?? '' );

			if ( '' === $pc_raw || '' === $zone_val ) {
				continue;
			}

			$state  = $state_col >= 0 ? trim( $row[ $state_col ] ?? '' ) : '';
			$suburb = $suburb_col >= 0 ? trim( $row[ $suburb_col ] ?? '' ) : '';

			// Handle ranges like "3000-3999".
			if ( str_contains( $pc_raw, '-' ) ) {
				[ $from_s, $to_s ] = explode( '-', $pc_raw, 2 );
				$from = intval( trim( $from_s ) );
				$to   = intval( trim( $to_s ) );
				if ( $from > 0 && $to >= $from ) {
					for ( $p = $from; $p <= $to; $p++ ) {
						$key = (string) $p;
						if ( ! isset( $seen[ $key ] ) ) {
							$seen[ $key ]       = true;
							$postcode_map[] = array(
								'postcode'  => $key,
								'zoneCode'  => $zone_val,
								'zone'      => $zone_val,
								'state'     => $state,
								'suburb'    => $suburb,
							);
						}
					}
				}
				continue;
			}

			// Individual postcode — validate Australian 4-digit format.
			$pc_int = intval( $pc_raw );
			if ( $pc_int < 200 || $pc_int > 9999 ) {
				continue;
			}
			$key = str_pad( (string) $pc_int, 4, '0', STR_PAD_LEFT );
			if ( ! isset( $seen[ $key ] ) ) {
				$seen[ $key ]   = true;
				$postcode_map[] = array(
					'postcode' => $key,
					'zoneCode' => $zone_val,
					'zone'     => $zone_val,
					'state'    => $state,
					'suburb'   => $suburb,
				);
			}
		}

		return $postcode_map;
	}

	private function find_col( array $lower_header, array $keywords ): int {
		foreach ( $lower_header as $idx => $cell ) {
			if ( in_array( $cell, $keywords, true ) ) {
				return $idx;
			}
		}
		// Partial match fallback
		foreach ( $lower_header as $idx => $cell ) {
			foreach ( $keywords as $kw ) {
				if ( str_contains( $cell, $kw ) ) {
					return $idx;
				}
			}
		}
		return -1;
	}

	// -------------------------------------------------------------------------
	// Rate card → text (for rapid-api)
	// -------------------------------------------------------------------------

	private function file_bytes_to_text( string $bytes, string $ext ): string {
		if ( 'csv' === $ext ) {
			return $bytes;
		}
		if ( 'xlsx' === $ext ) {
			// Reassemble rows back into CSV text for rapid-api
			$rows = $this->xlsx_to_rows( $bytes );
			$lines = array();
			foreach ( $rows as $row ) {
				$escaped = array_map( function ( $v ) {
					$v = str_replace( '"', '""', $v );
					return ( str_contains( $v, ',' ) || str_contains( $v, '"' ) ) ? '"' . $v . '"' : $v;
				}, $row );
				$lines[] = implode( ',', $escaped );
			}
			return implode( "\n", $lines );
		}
		return $bytes; // xls fallback — send raw (usually won't parse well but better than nothing)
	}

	// -------------------------------------------------------------------------
	// Build Model B rates from CSV + columnMap
	// -------------------------------------------------------------------------

	private function build_model_b_rates( string $rate_text, array $column_map, string $zone_code_col, string $zone_name_col ): array {
		$rows = $this->csv_bytes_to_rows( $rate_text );
		if ( empty( $rows ) ) {
			return array();
		}

		// Find header row containing zone code or zone name column
		$header     = null;
		$header_idx = 0;
		$lc_zone_code = strtolower( $zone_code_col );
		$lc_zone_name = strtolower( $zone_name_col );

		foreach ( $rows as $i => $row ) {
			$lower_row = array_map( fn( $v ) => strtolower( trim( $v ) ), $row );
			if ( in_array( $lc_zone_code, $lower_row, true ) || in_array( $lc_zone_name, $lower_row, true ) ) {
				$header     = $row;
				$header_idx = $i;
				break;
			}
		}

		if ( null === $header ) {
			return array();
		}

		// Build column index map (lowercased header → index)
		$col_index = array();
		foreach ( $header as $idx => $col_name ) {
			$col_index[ strtolower( trim( $col_name ) ) ] = $idx;
		}

		$zone_code_idx = $col_index[ $lc_zone_code ] ?? -1;
		$zone_name_idx = $col_index[ $lc_zone_name ] ?? -1;

		$rates = array();

		for ( $i = $header_idx + 1; $i < count( $rows ); $i++ ) {
			$row       = $rows[ $i ];
			$zone_code = $zone_code_idx >= 0 ? trim( $row[ $zone_code_idx ] ?? '' ) : '';
			$zone_name = $zone_name_idx >= 0 ? trim( $row[ $zone_name_idx ] ?? '' ) : $zone_code;

			if ( '' === $zone_code && '' === $zone_name ) {
				continue;
			}

			foreach ( $column_map as $depot => $cols ) {
				$basic_key  = strtolower( $cols['basic'] ?? '' );
				$per_kg_key = strtolower( $cols['perKg'] ?? '' );
				$min_key    = strtolower( $cols['minimum'] ?? '' );

				$basic_idx  = $col_index[ $basic_key ] ?? -1;
				$per_kg_idx = $col_index[ $per_kg_key ] ?? -1;
				$min_idx    = $col_index[ $min_key ] ?? -1;

				$basic  = $basic_idx >= 0 ? floatval( $row[ $basic_idx ] ?? 0 ) : 0.0;
				$per_kg = $per_kg_idx >= 0 ? floatval( $row[ $per_kg_idx ] ?? 0 ) : 0.0;
				$min    = $min_idx >= 0 ? floatval( $row[ $min_idx ] ?? 0 ) : 0.0;

				if ( 0.0 === $basic && 0.0 === $per_kg && 0.0 === $min ) {
					continue;
				}

				$rates[] = array(
					'originDepot'   => $depot,
					'zoneCode'      => $zone_code,
					'zone'          => $zone_name,
					'service'       => 'Road Express',
					'basicCharge'   => $basic,
					'minimumCharge' => $min,
					'perKgRate'     => $per_kg,
				);
			}
		}

		return $rates;
	}

	// -------------------------------------------------------------------------
	// Build Model C rates from standard CSV
	// -------------------------------------------------------------------------

	private function build_model_c_rates( string $rate_text ): array {
		$rows = $this->csv_bytes_to_rows( $rate_text );
		if ( empty( $rows ) ) {
			return array();
		}

		$header     = null;
		$header_idx = 0;
		foreach ( $rows as $i => $row ) {
			$row_clean = array_map( 'trim', $row );
			if ( in_array( 'OriginDepot', $row_clean, true ) && in_array( 'Destination', $row_clean, true ) ) {
				$header     = array_flip( $row_clean );
				$header_idx = $i;
				break;
			}
		}

		if ( null === $header ) {
			return array();
		}

		$rates = array();
		for ( $i = $header_idx + 1; $i < count( $rows ); $i++ ) {
			$row = array_map( 'trim', $rows[ $i ] );
			if ( empty( $row[0] ) ) {
				continue;
			}
			$rates[] = array(
				'originDepot'      => $row[ $header['OriginDepot'] ] ?? '',
				'destinationDepot' => $row[ $header['Destination'] ] ?? '',
				'basicCharge'      => floatval( $row[ $header['BasicCharge'] ] ?? 0 ),
				'minimumCharge'    => floatval( $row[ $header['Minimum'] ] ?? 0 ),
				'perKgRates'       => array(
					'1-250'       => floatval( $row[ $header['PerKg_1-250'] ] ?? 0 ),
					'251-500'     => floatval( $row[ $header['PerKg_251-500'] ] ?? 0 ),
					'501-1000'    => floatval( $row[ $header['PerKg_501-1000'] ] ?? 0 ),
					'1001-3000'   => floatval( $row[ $header['PerKg_1001-3000'] ] ?? 0 ),
					'3001-12000'  => floatval( $row[ $header['PerKg_3001-12000'] ] ?? 0 ),
					'12001+'      => floatval( $row[ $header['PerKg_12001+'] ] ?? 0 ),
				),
			);
		}

		return $rates;
	}

	// -------------------------------------------------------------------------
	// Render
	// -------------------------------------------------------------------------

	public function render_page(): void {
		$merchant_id = get_option( self::OPTION_KEY, '' );
		$notice      = isset( $_GET['siq_notice'] ) ? sanitize_key( $_GET['siq_notice'] ) : '';
		$error       = isset( $_GET['siq_error'] ) ? sanitize_text_field( urldecode( $_GET['siq_error'] ) ) : '';
		$active_tab  = isset( $_GET['siq_tab'] ) ? sanitize_key( $_GET['siq_tab'] ) : ( $merchant_id ? 'carrier' : 'signup' );
		$state       = isset( $_GET['siq_state'] ) ? sanitize_key( $_GET['siq_state'] ) : '';
		?>
		<div class="wrap">
			<h1><?php esc_html_e( 'ShippingIQ', 'shippingiq-freight-rates-for-woocommerce' ); ?></h1>

			<?php if ( 'connected' === $notice ) : ?>
				<div class="notice notice-success is-dismissible"><p><?php esc_html_e( 'Connected successfully. Your merchant account is active.', 'shippingiq-freight-rates-for-woocommerce' ); ?></p></div>
			<?php elseif ( 'disconnected' === $notice ) : ?>
				<div class="notice notice-info is-dismissible"><p><?php esc_html_e( 'Disconnected. Your merchant ID has been removed.', 'shippingiq-freight-rates-for-woocommerce' ); ?></p></div>
			<?php elseif ( 'carrier_saved' === $notice ) : ?>
				<div class="notice notice-success is-dismissible"><p><?php esc_html_e( 'Carrier saved. Rates are now live at checkout.', 'shippingiq-freight-rates-for-woocommerce' ); ?></p></div>
			<?php elseif ( 'carrier_deleted' === $notice ) : ?>
				<div class="notice notice-success is-dismissible"><p><?php esc_html_e( 'Carrier deleted.', 'shippingiq-freight-rates-for-woocommerce' ); ?></p></div>
			<?php elseif ( 'rules_saved' === $notice ) : ?>
				<div class="notice notice-success is-dismissible"><p><?php esc_html_e( 'Rules saved.', 'shippingiq-freight-rates-for-woocommerce' ); ?></p></div>
			<?php elseif ( 'ranges_saved' === $notice ) : ?>
				<div class="notice notice-success is-dismissible"><p><?php esc_html_e( 'Postcode ranges saved.', 'shippingiq-freight-rates-for-woocommerce' ); ?></p></div>
			<?php endif; ?>

			<?php if ( ! empty( $error ) ) : ?>
				<div class="notice notice-error is-dismissible"><p><?php echo esc_html( $error ); ?></p></div>
			<?php endif; ?>

			<?php if ( ! empty( $merchant_id ) ) : ?>
				<?php $this->render_connected( $merchant_id, $active_tab, $state ); ?>
			<?php else : ?>
				<?php $this->render_auth_tabs( $active_tab ); ?>
			<?php endif; ?>
		</div>
		<?php
	}

	private function render_connected( string $merchant_id, string $active_tab, string $state ): void {
		$tabs = array(
			'carrier' => __( 'My Carrier', 'shippingiq-freight-rates-for-woocommerce' ),
			'rules'   => __( 'Rules', 'shippingiq-freight-rates-for-woocommerce' ),
			'account' => __( 'Account', 'shippingiq-freight-rates-for-woocommerce' ),
		);
		?>
		<nav class="nav-tab-wrapper woo-nav-tab-wrapper">
			<?php foreach ( $tabs as $slug => $label ) : ?>
				<a href="<?php echo esc_url( $this->page_url( array( 'siq_tab' => $slug ) ) ); ?>"
				   class="nav-tab <?php echo $active_tab === $slug ? 'nav-tab-active' : ''; ?>">
					<?php echo esc_html( $label ); ?>
				</a>
			<?php endforeach; ?>
		</nav>

		<?php
		if ( 'account' === $active_tab ) {
			$this->render_account_tab( $merchant_id );
		} elseif ( 'rules' === $active_tab ) {
			$this->render_rules_tab( $merchant_id );
		} else {
			$this->render_carrier_tab( $merchant_id, $state );
		}
	}

	// -------------------------------------------------------------------------
	// Account tab
	// -------------------------------------------------------------------------

	private function render_account_tab( string $merchant_id ): void {
		?>
		<table class="form-table" role="presentation">
			<tr>
				<th scope="row"><?php esc_html_e( 'Status', 'shippingiq-freight-rates-for-woocommerce' ); ?></th>
				<td><span style="color:#00a32a;font-weight:600;">&#10003; <?php esc_html_e( 'Connected', 'shippingiq-freight-rates-for-woocommerce' ); ?></span></td>
			</tr>
			<tr>
				<th scope="row"><?php esc_html_e( 'Merchant ID', 'shippingiq-freight-rates-for-woocommerce' ); ?></th>
				<td><code><?php echo esc_html( $merchant_id ); ?></code></td>
			</tr>
		</table>
		<form method="post" action="">
			<?php wp_nonce_field( 'shippingiq_disconnect' ); ?>
			<input type="hidden" name="shippingiq_action" value="disconnect">
			<?php submit_button( __( 'Disconnect', 'shippingiq-freight-rates-for-woocommerce' ), 'delete', 'submit', false ); ?>
		</form>
		<?php
	}

	// -------------------------------------------------------------------------
	// Carrier tab
	// -------------------------------------------------------------------------

	private function render_carrier_tab( string $merchant_id, string $state ): void {
		$carriers          = $this->fetch_carriers( $merchant_id );
		$demo_carriers     = array_values( array_filter( $carriers, fn( $c ) => ! empty( $c['is_demo'] ) ) );
		$real_carriers     = array_values( array_filter( $carriers, fn( $c ) => empty( $c['is_demo'] ) ) );
		$active_real       = array_values( array_filter( $real_carriers, fn( $c ) => 'active' === $c['status'] ) );
		$expand_id         = isset( $_GET['siq_expand_ranges'] ) ? sanitize_text_field( wp_unslash( $_GET['siq_expand_ranges'] ) ) : '';
		// Separate fetch for parsed_data (real carriers only — free plan = 1 carrier max).
		$parsed_data_map   = ! empty( $real_carriers ) ? $this->fetch_real_carriers_parsed_data( $merchant_id ) : array();

		// Warning: no active real carriers — no rates at checkout. Show any time (zero carriers, only demo, or all deactivated).
		if ( empty( $active_real ) && 'analyzed' !== $state ) :
			?>
			<div class="notice notice-warning inline" style="margin-top:1em;max-width:720px;">
				<p><strong><?php esc_html_e( 'No active carriers', 'shippingiq-freight-rates-for-woocommerce' ); ?></strong> — <?php esc_html_e( 'no rates will appear at checkout. Activate a carrier or upload your rate card.', 'shippingiq-freight-rates-for-woocommerce' ); ?></p>
			</div>
		<?php endif;

		// Carrier list
		if ( ! empty( $carriers ) ) :
			?>
			<h2 style="margin-top:1.5em;"><?php esc_html_e( 'Your Carriers', 'shippingiq-freight-rates-for-woocommerce' ); ?></h2>
			<table class="wp-list-table widefat fixed striped" style="max-width:720px;">
				<thead>
					<tr>
						<th><?php esc_html_e( 'Name', 'shippingiq-freight-rates-for-woocommerce' ); ?></th>
						<th style="width:120px;"><?php esc_html_e( 'Status', 'shippingiq-freight-rates-for-woocommerce' ); ?></th>
						<th style="width:220px;"><?php esc_html_e( 'Actions', 'shippingiq-freight-rates-for-woocommerce' ); ?></th>
					</tr>
				</thead>
				<tbody>
				<?php foreach ( $carriers as $carrier ) :
					$is_demo       = ! empty( $carrier['is_demo'] );
					$is_active     = 'active' === $carrier['status'];
					$cid           = esc_attr( $carrier['id'] );
					$parsed        = $is_demo ? array() : ( $parsed_data_map[ $carrier['id'] ] ?? array() );
					$has_postcode  = ! empty( $parsed['postcodeMap'] );
					$manual_ranges = is_array( $parsed['manualPostcodeRanges'] ?? null ) ? $parsed['manualPostcodeRanges'] : array();
					$is_expanded   = ( $expand_id === $carrier['id'] && ! $is_demo );
					?>
					<tr>
						<td>
							<?php echo esc_html( $carrier['name'] ); ?>
							<?php if ( $is_demo ) : ?>
								<span style="display:inline-block;margin-left:8px;padding:2px 8px;background:#f0a500;color:#fff;border-radius:4px;font-size:11px;font-weight:600;vertical-align:middle;">
									<?php esc_html_e( 'Demo', 'shippingiq-freight-rates-for-woocommerce' ); ?>
								</span>
							<?php else : ?>
								<?php if ( ! $has_postcode ) : ?>
									<span style="display:inline-block;margin-left:8px;padding:2px 8px;background:#f0a500;color:#fff;border-radius:4px;font-size:11px;font-weight:600;vertical-align:middle;" title="<?php esc_attr_e( 'No postcode data — rates won\'t appear at checkout. Upload a zone file or enter ranges manually.', 'shippingiq-freight-rates-for-woocommerce' ); ?>">
										<?php esc_html_e( 'No postcode data', 'shippingiq-freight-rates-for-woocommerce' ); ?>
									</span>
								<?php endif; ?>
								<br>
								<?php
								$toggle_url = $is_expanded
									? $this->page_url( array( 'siq_tab' => 'carrier' ) )
									: $this->page_url( array( 'siq_tab' => 'carrier', 'siq_expand_ranges' => $carrier['id'] ) );
								?>
								<a href="<?php echo esc_url( $toggle_url ); ?>" style="font-size:12px;">
									<?php echo $is_expanded
										? esc_html__( 'Hide Ranges ▲', 'shippingiq-freight-rates-for-woocommerce' )
										: esc_html__( 'Postcode Ranges ▼', 'shippingiq-freight-rates-for-woocommerce' ); ?>
								</a>
							<?php endif; ?>
						</td>
						<td>
							<?php if ( $is_active ) : ?>
								<span style="color:#00a32a;font-weight:600;"><?php esc_html_e( 'Active', 'shippingiq-freight-rates-for-woocommerce' ); ?></span>
							<?php else : ?>
								<span style="color:#999;"><?php esc_html_e( 'Inactive', 'shippingiq-freight-rates-for-woocommerce' ); ?></span>
							<?php endif; ?>
						</td>
						<td>
							<?php if ( $is_demo ) : ?>
								<form method="post" action="" style="display:inline;">
									<?php wp_nonce_field( 'shippingiq_delete_carrier' ); ?>
									<input type="hidden" name="shippingiq_action" value="delete_carrier">
									<input type="hidden" name="siq_carrier_id" value="<?php echo $cid; ?>">
									<button type="submit" class="button button-small" style="color:#cc1818;border-color:#cc1818;" onclick="return confirm('Delete this demo carrier?');">
										<?php esc_html_e( 'Delete Demo', 'shippingiq-freight-rates-for-woocommerce' ); ?>
									</button>
								</form>
							<?php else : ?>
								<form method="post" action="" style="display:inline;">
									<?php wp_nonce_field( 'shippingiq_toggle_carrier' ); ?>
									<input type="hidden" name="shippingiq_action" value="toggle_carrier">
									<input type="hidden" name="siq_carrier_id" value="<?php echo $cid; ?>">
									<input type="hidden" name="siq_new_status" value="<?php echo $is_active ? 'inactive' : 'active'; ?>">
									<button type="submit" class="button button-small">
										<?php echo $is_active ? esc_html__( 'Deactivate', 'shippingiq-freight-rates-for-woocommerce' ) : esc_html__( 'Activate', 'shippingiq-freight-rates-for-woocommerce' ); ?>
									</button>
								</form>
								&nbsp;
								<form method="post" action="" style="display:inline;">
									<?php wp_nonce_field( 'shippingiq_delete_carrier' ); ?>
									<input type="hidden" name="shippingiq_action" value="delete_carrier">
									<input type="hidden" name="siq_carrier_id" value="<?php echo $cid; ?>">
									<button type="submit" class="button button-small" style="color:#cc1818;border-color:#cc1818;" onclick="return confirm('Delete this carrier? This cannot be undone.');">
										<?php esc_html_e( 'Delete', 'shippingiq-freight-rates-for-woocommerce' ); ?>
									</button>
								</form>
							<?php endif; ?>
						</td>
					</tr>
					<?php if ( $is_demo ) : ?>
					<tr style="background:#fff8e1;">
						<td colspan="3" style="padding:8px 12px;font-size:12px;color:#555;">
							<?php esc_html_e( 'This is example data. Delete it and upload your own rate card to go live.', 'shippingiq-freight-rates-for-woocommerce' ); ?>
						</td>
					</tr>
					<?php endif; ?>
					<?php if ( $is_expanded ) : ?>
					<tr>
						<td colspan="3" style="background:#f9f9f9;border-top:1px solid #e0e0e0;padding:16px;">
							<strong><?php esc_html_e( 'Postcode Ranges', 'shippingiq-freight-rates-for-woocommerce' ); ?></strong>
							<p class="description" style="margin-bottom:12px;max-width:560px;">
								<?php esc_html_e( 'Map postcode ranges to zone codes. These zones must match the zone column in your rate card. Click Save Ranges when done.', 'shippingiq-freight-rates-for-woocommerce' ); ?>
							</p>
							<form method="post" action="">
								<?php wp_nonce_field( 'shippingiq_save_ranges' ); ?>
								<input type="hidden" name="shippingiq_action" value="save_ranges">
								<input type="hidden" name="siq_carrier_id" value="<?php echo $cid; ?>">
								<table id="siq-ranges-table-<?php echo $cid; ?>" style="border-collapse:collapse;margin-bottom:10px;">
									<thead>
										<tr>
											<th style="padding:4px 8px;text-align:left;font-weight:600;"><?php esc_html_e( 'From', 'shippingiq-freight-rates-for-woocommerce' ); ?></th>
											<th style="padding:4px 8px;text-align:left;font-weight:600;"><?php esc_html_e( 'To', 'shippingiq-freight-rates-for-woocommerce' ); ?></th>
											<th style="padding:4px 8px;text-align:left;font-weight:600;"><?php esc_html_e( 'Zone', 'shippingiq-freight-rates-for-woocommerce' ); ?></th>
											<th></th>
										</tr>
									</thead>
									<tbody id="siq-ranges-body-<?php echo $cid; ?>">
										<?php if ( ! empty( $manual_ranges ) ) : ?>
											<?php foreach ( $manual_ranges as $range ) : ?>
											<tr>
												<td style="padding:2px 4px;"><input type="text" name="siq_range_from[]" value="<?php echo esc_attr( $range['from'] ); ?>" size="6" maxlength="4"></td>
												<td style="padding:2px 4px;"><input type="text" name="siq_range_to[]" value="<?php echo esc_attr( $range['to'] ); ?>" size="6" maxlength="4"></td>
												<td style="padding:2px 4px;"><input type="text" name="siq_range_zone[]" value="<?php echo esc_attr( $range['zone'] ); ?>" size="20" maxlength="50"></td>
												<td style="padding:2px 4px;"><button type="button" class="button button-small" onclick="this.closest('tr').remove()"><?php esc_html_e( 'Remove', 'shippingiq-freight-rates-for-woocommerce' ); ?></button></td>
											</tr>
											<?php endforeach; ?>
										<?php else : ?>
											<tr>
												<td style="padding:2px 4px;"><input type="text" name="siq_range_from[]" value="" size="6" maxlength="4" placeholder="3000"></td>
												<td style="padding:2px 4px;"><input type="text" name="siq_range_to[]" value="" size="6" maxlength="4" placeholder="3999"></td>
												<td style="padding:2px 4px;"><input type="text" name="siq_range_zone[]" value="" size="20" maxlength="50" placeholder="Zone 1"></td>
												<td style="padding:2px 4px;"><button type="button" class="button button-small" onclick="this.closest('tr').remove()"><?php esc_html_e( 'Remove', 'shippingiq-freight-rates-for-woocommerce' ); ?></button></td>
											</tr>
										<?php endif; ?>
									</tbody>
								</table>
								<button type="button" class="button" onclick="siqAddRangeRow('<?php echo $cid; ?>')" style="margin-right:8px;">
									<?php esc_html_e( '+ Add Row', 'shippingiq-freight-rates-for-woocommerce' ); ?>
								</button>
								<?php submit_button( __( 'Save Ranges', 'shippingiq-freight-rates-for-woocommerce' ), 'primary', 'submit', false ); ?>
								<p class="description" style="margin-top:8px;"><?php esc_html_e( 'Each range expands to individual postcodes. Maximum 5,000 postcodes per range.', 'shippingiq-freight-rates-for-woocommerce' ); ?></p>
							</form>
						</td>
					</tr>
					<?php endif; ?>
				<?php endforeach; ?>
				</tbody>
			</table>

			<!-- Test a postcode -->
			<div style="margin-top:1.5em;max-width:720px;padding:12px 16px;background:#f9f9f9;border:1px solid #e0e0e0;border-radius:4px;">
				<strong><?php esc_html_e( 'Test a postcode', 'shippingiq-freight-rates-for-woocommerce' ); ?></strong>
				<div style="display:flex;align-items:center;gap:8px;margin-top:8px;flex-wrap:wrap;">
					<input type="text" id="siq_test_postcode_input" maxlength="4" style="width:80px;" placeholder="e.g. 3000">
					<button type="button" id="siq_test_postcode_btn" class="button"><?php esc_html_e( 'Test', 'shippingiq-freight-rates-for-woocommerce' ); ?></button>
					<span id="siq_test_postcode_result" style="font-size:13px;"></span>
				</div>
				<p class="description" style="margin-top:6px;"><?php esc_html_e( 'Uses a dummy 1 kg, 30×20×10 cm item. Confirms your carrier and zone file are wired up correctly.', 'shippingiq-freight-rates-for-woocommerce' ); ?></p>
			</div>
		<?php endif; ?>

		<?php
		// Upload form (only if 0 real carriers)
		if ( empty( $real_carriers ) ) {
			if ( 'analyzed' === $state ) {
				$this->render_analysis_results( $merchant_id );
			} else {
				$this->render_upload_form();
			}
		} else {
			// Already has 1 real carrier — show upgrade prompt
			?>
			<div class="notice notice-info inline" style="margin-top:1.5em;max-width:720px;">
				<p>
					<?php esc_html_e( "You're on the Free plan — 1 carrier included.", 'shippingiq-freight-rates-for-woocommerce' ); ?>
					<a href="https://shippingiq.com.au/pricing" target="_blank" rel="noopener">
						<?php esc_html_e( 'Upgrade to Pro for unlimited carriers.', 'shippingiq-freight-rates-for-woocommerce' ); ?>
					</a>
				</p>
			</div>
			<?php
		}
	}

	private function render_upload_form(): void {
		?>
		<h2 style="margin-top:1.5em;"><?php esc_html_e( 'Upload Your Rate Card', 'shippingiq-freight-rates-for-woocommerce' ); ?></h2>
		<p class="description" style="max-width:600px;">
			<?php esc_html_e( 'Upload your carrier rate card and zone file. ShippingIQ AI will analyse the structure and set up rates at checkout automatically.', 'shippingiq-freight-rates-for-woocommerce' ); ?>
		</p>

		<div id="siq_xls_error" style="display:none;" class="notice notice-warning inline">
			<p><?php esc_html_e( '.xls format is not supported. Please save your file as .xlsx or .csv and re-upload.', 'shippingiq-freight-rates-for-woocommerce' ); ?></p>
		</div>
		<div id="siq_pdf_error_rate" style="display:none;" class="notice notice-warning inline">
			<p><?php echo wp_kses(
				__( 'PDF upload is a Pro feature. Convert your PDF rate card at <a href="https://shippingiq.com.au/pricing" target="_blank" rel="noopener">shippingiq.com.au/pricing</a>', 'shippingiq-freight-rates-for-woocommerce' ),
				array( 'a' => array( 'href' => array(), 'target' => array(), 'rel' => array() ) )
			); ?></p>
		</div>
		<div id="siq_pdf_error_zone" style="display:none;" class="notice notice-warning inline">
			<p><?php esc_html_e( 'Zone file must be a CSV or Excel file (.csv, .xlsx).', 'shippingiq-freight-rates-for-woocommerce' ); ?></p>
		</div>

		<form method="post" action="" enctype="multipart/form-data" style="max-width:600px;margin-top:1em;">
			<?php wp_nonce_field( 'shippingiq_analyse_carrier' ); ?>
			<input type="hidden" name="shippingiq_action" value="analyse_carrier">
			<table class="form-table" role="presentation">
				<tr>
					<th scope="row">
						<label for="siq_carrier_name"><?php esc_html_e( 'Carrier Name', 'shippingiq-freight-rates-for-woocommerce' ); ?></label>
					</th>
					<td>
						<input type="text" id="siq_carrier_name" name="siq_carrier_name" class="regular-text" required placeholder="e.g. Allied Express">
					</td>
				</tr>
				<tr>
					<th scope="row">
						<label for="siq_rate_card"><?php esc_html_e( 'Rate Card', 'shippingiq-freight-rates-for-woocommerce' ); ?></label>
					</th>
					<td>
						<input type="file" id="siq_rate_card" name="siq_rate_card" accept=".csv,.xlsx,.xls" required>
						<p class="description"><?php esc_html_e( 'Your carrier\'s rate card file. Ask your carrier for a CSV or Excel copy. ShippingIQ AI will interpret any format automatically.', 'shippingiq-freight-rates-for-woocommerce' ); ?><br><a href="https://shippingiq.com.au/templates/rate-card-template.csv" target="_blank"><?php esc_html_e( 'Download template', 'shippingiq-freight-rates-for-woocommerce' ); ?></a></p>
					</td>
				</tr>
				<tr>
					<th scope="row">
						<label for="siq_zone_file"><?php esc_html_e( 'Zone File', 'shippingiq-freight-rates-for-woocommerce' ); ?></label>
					</th>
					<td>
						<input type="file" id="siq_zone_file" name="siq_zone_file" accept=".csv,.xlsx,.xls">
						<p class="description"><?php esc_html_e( 'Your carrier\'s postcode-to-zone mapping file. Ask your carrier for this specifically if they haven\'t provided it — without it, no rates will appear at checkout.', 'shippingiq-freight-rates-for-woocommerce' ); ?><br><a href="https://shippingiq.com.au/templates/zone-file-template.csv" target="_blank"><?php esc_html_e( 'Download template', 'shippingiq-freight-rates-for-woocommerce' ); ?></a></p>
					</td>
				</tr>
			</table>
			<?php submit_button( __( 'Analyse', 'shippingiq-freight-rates-for-woocommerce' ), 'primary', 'submit', false ); ?>
			<p class="description" style="margin-top:0.5em;"><?php esc_html_e( 'Analysis takes 20–40 seconds. Please wait after clicking.', 'shippingiq-freight-rates-for-woocommerce' ); ?></p>
			<p style="margin-top: 8px; font-size: 13px;"><?php esc_html_e( 'Need help? See the', 'shippingiq-freight-rates-for-woocommerce' ); ?> <a href="https://shippingiq.com.au/resources" target="_blank"><?php esc_html_e( 'ShippingIQ setup guide', 'shippingiq-freight-rates-for-woocommerce' ); ?></a> <?php esc_html_e( 'for instructions on getting your carrier files.', 'shippingiq-freight-rates-for-woocommerce' ); ?></p>
		</form>
		<?php
	}

	private function render_analysis_results( string $merchant_id ): void {
		$transient_key = 'siq_analysis_' . $merchant_id;
		$data          = get_transient( $transient_key );

		if ( empty( $data ) ) {
			?>
			<div class="notice notice-warning inline" style="margin-top:1em;">
				<p><?php esc_html_e( 'Analysis data has expired. Please upload your files again.', 'shippingiq-freight-rates-for-woocommerce' ); ?></p>
			</div>
			<?php
			$this->render_upload_form();
			return;
		}

		$structure    = $data['structure'];
		$carrier_name = $data['carrier_name'];
		$model        = $structure['pricingModel'] ?? 'unknown';
		$depots       = $structure['originDepots'] ?? array();
		$postcode_map = $data['postcode_map'] ?? array();

		// Determine zones/rates count for display
		$rates_count = 0;
		if ( 'B' === $model ) {
			$rates_count = count( $structure['columnMap'] ?? array() ) > 0
				? count( $structure['columnMap'] )
				: 0;
			$zones_label = count( $structure['columnMap'] ?? array() ) . __( ' depot(s)', 'shippingiq-freight-rates-for-woocommerce' );
		} elseif ( 'A' === $model ) {
			$rates_count = count( $structure['zones'] ?? array() );
			$zones_label = $rates_count . __( ' zones', 'shippingiq-freight-rates-for-woocommerce' );
		} elseif ( 'C' === $model ) {
			$rates_count = count( $structure['modelCRates'] ?? array() );
			$zones_label = $rates_count . __( ' destinations', 'shippingiq-freight-rates-for-woocommerce' );
		} else {
			$zones_label = '—';
		}

		$model_labels = array( 'A' => 'Model A (weight break)', 'B' => 'Model B (basic + per kg)', 'C' => 'Model C (depot-to-depot)' );
		?>
		<h2 style="margin-top:1.5em;"><?php esc_html_e( 'Analysis Result', 'shippingiq-freight-rates-for-woocommerce' ); ?></h2>
		<table class="form-table" role="presentation" style="max-width:600px;">
			<tr>
				<th><?php esc_html_e( 'Carrier', 'shippingiq-freight-rates-for-woocommerce' ); ?></th>
				<td><?php echo esc_html( $carrier_name ); ?></td>
			</tr>
			<tr>
				<th><?php esc_html_e( 'Pricing Model', 'shippingiq-freight-rates-for-woocommerce' ); ?></th>
				<td><?php echo esc_html( $model_labels[ $model ] ?? $model ); ?></td>
			</tr>
			<tr>
				<th><?php esc_html_e( 'Origin Depots', 'shippingiq-freight-rates-for-woocommerce' ); ?></th>
				<td><?php echo esc_html( implode( ', ', $depots ) ?: '—' ); ?></td>
			</tr>
			<tr>
				<th><?php esc_html_e( 'Zones / Rates', 'shippingiq-freight-rates-for-woocommerce' ); ?></th>
				<td><?php echo esc_html( $zones_label ); ?></td>
			</tr>
			<tr>
				<th><?php esc_html_e( 'Postcodes Mapped', 'shippingiq-freight-rates-for-woocommerce' ); ?></th>
				<td>
					<?php echo esc_html( count( $postcode_map ) ); ?>
					<?php if ( empty( $postcode_map ) ) : ?>
						<span style="color:#cc1818;margin-left:6px;"><?php esc_html_e( '(no zone file — quotes will fail at checkout)', 'shippingiq-freight-rates-for-woocommerce' ); ?></span>
					<?php endif; ?>
				</td>
			</tr>
			<?php if ( ! empty( $structure['summary'] ) ) : ?>
			<tr>
				<th><?php esc_html_e( 'Summary', 'shippingiq-freight-rates-for-woocommerce' ); ?></th>
				<td><?php echo esc_html( $structure['summary'] ); ?></td>
			</tr>
			<?php endif; ?>
		</table>

		<p style="margin-top:1em;">
			<form method="post" action="" style="display:inline-block;margin-right:8px;">
				<?php wp_nonce_field( 'shippingiq_save_carrier' ); ?>
				<input type="hidden" name="shippingiq_action" value="save_carrier">
				<?php submit_button( __( 'Save Carrier', 'shippingiq-freight-rates-for-woocommerce' ), 'primary', 'submit', false ); ?>
			</form>
			<form method="post" action="" style="display:inline-block;">
				<?php wp_nonce_field( 'shippingiq_cancel_analysis' ); ?>
				<input type="hidden" name="shippingiq_action" value="cancel_analysis">
				<?php submit_button( __( 'Cancel', 'shippingiq-freight-rates-for-woocommerce' ), 'secondary', 'submit', false ); ?>
			</form>
		</p>
		<p class="description"><?php esc_html_e( 'Saving will extract surcharges and make rates live at checkout (another 20–40 seconds).', 'shippingiq-freight-rates-for-woocommerce' ); ?></p>
		<?php
	}

	// -------------------------------------------------------------------------
	// Rules tab
	// -------------------------------------------------------------------------

	private function render_rules_tab( string $merchant_id ): void {
		$rules                  = $this->fetch_merchant_rules( $merchant_id );
		$free_enabled           = ! empty( $rules['freeShippingEnabled'] );
		$free_threshold         = floatval( $rules['freeShippingThreshold'] ?? 0 );
		$free_mode              = $rules['freeShippingMode'] ?? 'smart';
		$display_mode           = $rules['displayMode'] ?? get_option( 'shippingiq_display_mode', 'all' );
		?>
		<h2 style="margin-top:1.5em;"><?php esc_html_e( 'Shipping Rules', 'shippingiq-freight-rates-for-woocommerce' ); ?></h2>
		<form method="post" action="" style="max-width:600px;">
			<?php wp_nonce_field( 'shippingiq_save_rules' ); ?>
			<input type="hidden" name="shippingiq_action" value="save_rules">
			<table class="form-table" role="presentation">
				<tr>
					<th scope="row"><?php esc_html_e( 'Free Shipping', 'shippingiq-freight-rates-for-woocommerce' ); ?></th>
					<td>
						<label>
							<input type="checkbox" name="siq_free_shipping_enabled" value="1" <?php checked( $free_enabled ); ?>>
							<?php esc_html_e( 'Enable free shipping threshold', 'shippingiq-freight-rates-for-woocommerce' ); ?>
						</label>
						<div id="siq_threshold_row" style="margin-top:8px;<?php echo $free_enabled ? '' : 'display:none;'; ?>">
							<label>
								<?php esc_html_e( 'Free shipping on orders over AUD $', 'shippingiq-freight-rates-for-woocommerce' ); ?>
								<input type="number" name="siq_free_shipping_threshold" value="<?php echo esc_attr( $free_threshold ); ?>" min="0" step="0.01" style="width:80px;">
							</label>
						</div>
					</td>
				</tr>
				<tr>
					<th scope="row"><?php esc_html_e( 'Free Shipping Mode', 'shippingiq-freight-rates-for-woocommerce' ); ?></th>
					<td>
						<fieldset>
							<label>
								<input type="radio" name="siq_free_shipping_mode" value="smart" <?php checked( $free_mode, 'smart' ); ?>>
								<?php esc_html_e( 'Smart — surcharges override free shipping', 'shippingiq-freight-rates-for-woocommerce' ); ?>
							</label><br>
							<label>
								<input type="radio" name="siq_free_shipping_mode" value="true" <?php checked( $free_mode, 'true' ); ?>>
								<?php esc_html_e( 'Always Free — $0 even when surcharges apply', 'shippingiq-freight-rates-for-woocommerce' ); ?>
							</label>
						</fieldset>
					</td>
				</tr>
				<tr>
					<th scope="row"><?php esc_html_e( 'Display Mode', 'shippingiq-freight-rates-for-woocommerce' ); ?></th>
					<td>
						<fieldset>
							<label>
								<input type="radio" name="siq_display_mode" value="all" <?php checked( $display_mode, 'all' ); ?>>
								<?php esc_html_e( 'All carriers', 'shippingiq-freight-rates-for-woocommerce' ); ?>
							</label><br>
							<label>
								<input type="radio" name="siq_display_mode" value="cheapest" <?php checked( $display_mode, 'cheapest' ); ?>>
								<?php esc_html_e( 'Cheapest only', 'shippingiq-freight-rates-for-woocommerce' ); ?>
							</label><br>
							<label>
								<input type="radio" name="siq_display_mode" value="priority" <?php checked( $display_mode, 'priority' ); ?>>
								<?php esc_html_e( 'Priority (top-ranked carrier that services the postcode)', 'shippingiq-freight-rates-for-woocommerce' ); ?>
							</label>
						</fieldset>
					</td>
				</tr>
			</table>
			<?php submit_button( __( 'Save Rules', 'shippingiq-freight-rates-for-woocommerce' ) ); ?>
		</form>
		<script>
		jQuery(function($){
			$('input[name="siq_free_shipping_enabled"]').on('change', function(){
				$('#siq_threshold_row').toggle(this.checked);
			});
		});
		</script>
		<?php
	}

	// -------------------------------------------------------------------------
	// Auth tabs (not connected state)
	// -------------------------------------------------------------------------

	private function render_auth_tabs( string $active_tab ): void {
		$signup_url = $this->page_url( array( 'siq_tab' => 'signup' ) );
		$login_url  = $this->page_url( array( 'siq_tab' => 'login' ) );
		?>
		<nav class="nav-tab-wrapper woo-nav-tab-wrapper">
			<a href="<?php echo esc_url( $signup_url ); ?>" class="nav-tab <?php echo 'signup' === $active_tab ? 'nav-tab-active' : ''; ?>">
				<?php esc_html_e( 'Sign Up', 'shippingiq-freight-rates-for-woocommerce' ); ?>
			</a>
			<a href="<?php echo esc_url( $login_url ); ?>" class="nav-tab <?php echo 'login' === $active_tab ? 'nav-tab-active' : ''; ?>">
				<?php esc_html_e( 'Log In', 'shippingiq-freight-rates-for-woocommerce' ); ?>
			</a>
		</nav>

		<?php if ( 'signup' === $active_tab ) : ?>
			<form method="post" action="">
				<?php wp_nonce_field( 'shippingiq_signup' ); ?>
				<input type="hidden" name="shippingiq_action" value="signup">
				<table class="form-table" role="presentation">
					<tr>
						<th scope="row"><label for="siq_signup_email"><?php esc_html_e( 'Email', 'shippingiq-freight-rates-for-woocommerce' ); ?></label></th>
						<td><input type="email" id="siq_signup_email" name="siq_email" class="regular-text" required autocomplete="email"></td>
					</tr>
					<tr>
						<th scope="row"><label for="siq_signup_password"><?php esc_html_e( 'Password', 'shippingiq-freight-rates-for-woocommerce' ); ?></label></th>
						<td>
							<input type="password" id="siq_signup_password" name="siq_password" class="regular-text" required autocomplete="new-password">
							<p class="description"><?php esc_html_e( 'Minimum 6 characters.', 'shippingiq-freight-rates-for-woocommerce' ); ?></p>
						</td>
					</tr>
				</table>
				<?php submit_button( __( 'Create Account', 'shippingiq-freight-rates-for-woocommerce' ) ); ?>
			</form>
		<?php else : ?>
			<form method="post" action="">
				<?php wp_nonce_field( 'shippingiq_login' ); ?>
				<input type="hidden" name="shippingiq_action" value="login">
				<table class="form-table" role="presentation">
					<tr>
						<th scope="row"><label for="siq_login_email"><?php esc_html_e( 'Email', 'shippingiq-freight-rates-for-woocommerce' ); ?></label></th>
						<td><input type="email" id="siq_login_email" name="siq_email" class="regular-text" required autocomplete="email"></td>
					</tr>
					<tr>
						<th scope="row"><label for="siq_login_password"><?php esc_html_e( 'Password', 'shippingiq-freight-rates-for-woocommerce' ); ?></label></th>
						<td><input type="password" id="siq_login_password" name="siq_password" class="regular-text" required autocomplete="current-password"></td>
					</tr>
				</table>
				<?php submit_button( __( 'Log In', 'shippingiq-freight-rates-for-woocommerce' ) ); ?>
			</form>
		<?php endif;
	}

	// -------------------------------------------------------------------------
	// Helpers
	// -------------------------------------------------------------------------

	private function page_url( array $args = array() ): string {
		return add_query_arg( array_merge( array( 'page' => 'shippingiq-account' ), $args ), admin_url( 'admin.php' ) );
	}

	private function check_response( $response ): ?string {
		if ( is_wp_error( $response ) ) {
			return $response->get_error_message();
		}
		$code = (int) wp_remote_retrieve_response_code( $response );
		if ( $code < 200 || $code >= 300 ) {
			$body = json_decode( wp_remote_retrieve_body( $response ), true );
			$msg  = $body['error'] ?? $body['error_description'] ?? $body['msg'] ?? '';
			return $msg ?: sprintf(
				/* translators: HTTP status code */
				__( 'Request failed (HTTP %d). Please try again.', 'shippingiq-freight-rates-for-woocommerce' ),
				$code
			);
		}
		return null;
	}

	private function redirect_with_error( string $tab, string $message ): void {
		wp_safe_redirect( $this->page_url( array( 'siq_tab' => $tab, 'siq_error' => rawurlencode( $message ) ) ) );
		exit;
	}

	private function redirect_with_error_tab( string $tab, string $message ): void {
		$this->redirect_with_error( $tab, $message );
	}
}
