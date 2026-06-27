<?php
/**
 * ShippingIQ Admin — account connection page under WooCommerce → ShippingIQ.
 *
 * Handles:
 *   - Admin menu registration
 *   - Sign-up form (POST → register-merchant edge function)
 *   - Log-in form (POST → Supabase Auth → profile lookup)
 *   - Disconnect (delete wp_options entry)
 *   - Storing/reading merchant_id via get_option('shippingiq_merchant_id')
 */

defined( 'ABSPATH' ) || exit;

class ShippingIQ_Admin {

	const OPTION_KEY    = 'shippingiq_merchant_id';
	const SUPABASE_URL  = 'https://soaxvqkkecqzarwmbeip.supabase.co';
	const ANON_KEY      = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNvYXh2cWtrZWNxemFyd21iZWlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxNjU1NTEsImV4cCI6MjA5Mjc0MTU1MX0.dWydniFxo4a7T1TkBO6Hrj3ZfO7khjygvHegf3-3Jjw';

	public function __construct() {
		add_action( 'admin_menu', array( $this, 'register_menu' ) );
		add_action( 'admin_init', array( $this, 'handle_form_submission' ) );
	}

	// -------------------------------------------------------------------------
	// Menu
	// -------------------------------------------------------------------------

	public function register_menu() {
		add_submenu_page(
			'woocommerce',
			__( 'ShippingIQ', 'shippingiq-freight-rates-for-woocommerce' ),
			__( 'ShippingIQ', 'shippingiq-freight-rates-for-woocommerce' ),
			'manage_woocommerce',
			'shippingiq-account',
			array( $this, 'render_page' )
		);
	}

	// -------------------------------------------------------------------------
	// Form processing (runs before any output)
	// -------------------------------------------------------------------------

	public function handle_form_submission() {
		if ( ! isset( $_POST['shippingiq_action'] ) ) {
			return;
		}

		if ( ! current_user_can( 'manage_woocommerce' ) ) {
			wp_die( esc_html__( 'You do not have permission to do this.', 'shippingiq-freight-rates-for-woocommerce' ) );
		}

		$action = sanitize_key( $_POST['shippingiq_action'] );

		if ( 'disconnect' === $action ) {
			check_admin_referer( 'shippingiq_disconnect' );
			delete_option( self::OPTION_KEY );
			wp_safe_redirect( add_query_arg( array( 'page' => 'shippingiq-account', 'siq_notice' => 'disconnected' ), admin_url( 'admin.php' ) ) );
			exit;
		}

		if ( 'signup' === $action ) {
			check_admin_referer( 'shippingiq_signup' );
			$this->process_signup();
			return;
		}

		if ( 'login' === $action ) {
			check_admin_referer( 'shippingiq_login' );
			$this->process_login();
			return;
		}
	}

	// -------------------------------------------------------------------------
	// Sign-up
	// -------------------------------------------------------------------------

	private function process_signup() {
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

		$body = json_decode( wp_remote_retrieve_body( $response ), true );
		$merchant_id = $body['merchant_id'] ?? '';

		if ( empty( $merchant_id ) ) {
			$this->redirect_with_error( 'signup', __( 'Signup succeeded but no merchant ID was returned. Please contact support.', 'shippingiq-freight-rates-for-woocommerce' ) );
			return;
		}

		update_option( self::OPTION_KEY, sanitize_text_field( $merchant_id ) );
		wp_safe_redirect( add_query_arg( array( 'page' => 'shippingiq-account', 'siq_notice' => 'connected' ), admin_url( 'admin.php' ) ) );
		exit;
	}

	// -------------------------------------------------------------------------
	// Log in
	// -------------------------------------------------------------------------

	private function process_login() {
		$email    = sanitize_email( $_POST['siq_email'] ?? '' );
		$password = $_POST['siq_password'] ?? '';

		if ( ! is_email( $email ) || empty( $password ) ) {
			$this->redirect_with_error( 'login', __( 'Please enter a valid email and password.', 'shippingiq-freight-rates-for-woocommerce' ) );
			return;
		}

		// Step 1: authenticate and get user_id from Supabase Auth.
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
		error_log( print_r( $auth_body, true ) );
		$user_id      = $auth_body['user']['id'] ?? '';
		$access_token = $auth_body['access_token'] ?? '';

		if ( empty( $user_id ) || empty( $access_token ) ) {
			$this->redirect_with_error( 'login', __( 'Login failed: could not retrieve user ID.', 'shippingiq-freight-rates-for-woocommerce' ) );
			return;
		}

		// Step 2: fetch merchant_id via the get-merchant-id edge function.
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
		wp_safe_redirect( add_query_arg( array( 'page' => 'shippingiq-account', 'siq_notice' => 'connected' ), admin_url( 'admin.php' ) ) );
		exit;
	}

	// -------------------------------------------------------------------------
	// Render
	// -------------------------------------------------------------------------

	public function render_page() {
		$merchant_id = get_option( self::OPTION_KEY, '' );
		$notice      = isset( $_GET['siq_notice'] ) ? sanitize_key( $_GET['siq_notice'] ) : '';
		$error       = isset( $_GET['siq_error'] ) ? sanitize_text_field( urldecode( $_GET['siq_error'] ) ) : '';
		$active_tab  = isset( $_GET['siq_tab'] ) ? sanitize_key( $_GET['siq_tab'] ) : 'signup';
		?>
		<div class="wrap">
			<h1><?php esc_html_e( 'ShippingIQ Account', 'shippingiq-freight-rates-for-woocommerce' ); ?></h1>

			<?php if ( 'connected' === $notice ) : ?>
				<div class="notice notice-success is-dismissible">
					<p><?php esc_html_e( 'Connected successfully. Your merchant account is active.', 'shippingiq-freight-rates-for-woocommerce' ); ?></p>
				</div>
			<?php elseif ( 'disconnected' === $notice ) : ?>
				<div class="notice notice-info is-dismissible">
					<p><?php esc_html_e( 'Disconnected. Your merchant ID has been removed.', 'shippingiq-freight-rates-for-woocommerce' ); ?></p>
				</div>
			<?php endif; ?>

			<?php if ( ! empty( $error ) ) : ?>
				<div class="notice notice-error is-dismissible">
					<p><?php echo esc_html( $error ); ?></p>
				</div>
			<?php endif; ?>

			<?php if ( ! empty( $merchant_id ) ) : ?>

				<?php $this->render_connected( $merchant_id ); ?>

			<?php else : ?>

				<?php $this->render_auth_tabs( $active_tab ); ?>

			<?php endif; ?>
		</div>
		<?php
	}

	private function render_connected( string $merchant_id ) {
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

	private function render_auth_tabs( string $active_tab ) {
		$signup_url = add_query_arg( array( 'page' => 'shippingiq-account', 'siq_tab' => 'signup' ), admin_url( 'admin.php' ) );
		$login_url  = add_query_arg( array( 'page' => 'shippingiq-account', 'siq_tab' => 'login' ), admin_url( 'admin.php' ) );
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

		<?php endif; ?>
		<?php
	}

	// -------------------------------------------------------------------------
	// Helpers
	// -------------------------------------------------------------------------

	/**
	 * Validate a wp_remote_* response and return an error string or null.
	 */
	private function check_response( $response ): ?string {
		if ( is_wp_error( $response ) ) {
			return $response->get_error_message();
		}

		$code = (int) wp_remote_retrieve_response_code( $response );
		if ( $code < 200 || $code >= 300 ) {
			$body = json_decode( wp_remote_retrieve_body( $response ), true );
			// Surface the API's own error message when available.
			$msg = $body['error'] ?? $body['error_description'] ?? $body['msg'] ?? '';
			return $msg ?: sprintf(
				/* translators: HTTP status code */
				__( 'Request failed (HTTP %d). Please try again.', 'shippingiq-freight-rates-for-woocommerce' ),
				$code
			);
		}

		return null;
	}

	/**
	 * Redirect back to the admin page with an error message and the given tab active.
	 */
	private function redirect_with_error( string $tab, string $message ) {
		wp_safe_redirect( add_query_arg(
			array(
				'page'      => 'shippingiq-account',
				'siq_tab'   => $tab,
				'siq_error' => rawurlencode( $message ),
			),
			admin_url( 'admin.php' )
		) );
		exit;
	}
}
