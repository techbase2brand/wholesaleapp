import React, { useContext, useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Image, KeyboardAvoidingView, Platform, ImageBackground, Pressable } from 'react-native';
import { widthPercentageToDP as wp, heightPercentageToDP as hp, } from '../utils';
import { spacings, style } from '../constants/Fonts';
import { BaseStyle } from '../constants/Style';
import { whiteColor, blackColor, grayColor, lightBlueColor, redColor } from '../constants/Color'
import {
  LOGIN, REGISTER, DONT_HAVE_AN_ACCOUNT, PASSWORD_MUST_BE_AT, INVALID_EMAIL_FORMAT, PLEASE_FILL_ALL_FIELD, EMAIL, PASSWORD, BY_CONTINUING_YOU_AGREE, getAdminAccessToken,
  getStoreDomain, WEBCLIENT_ID_FOR_GOOGLE_LOGIN, FORGET_PASSWORD, REMEMBER_ME, TERM_OF_SERVICES, PRIVACY_POLICY, CONTENT_POLICY, STOREFRONT_DOMAIN, ADMINAPI_ACCESS_TOKEN,
  PRIVACY_POLICY_URL, TERM_OF_SERVICES_URL, CONTENT_POLICY_URL
} from '../constants/Constants'
import { GOOGLE_LOGO_IMAGE, FACEBOOK_LOGO_IMAGE, BACKGROUND_IMAGE, MORE_DOTS_IMAGE, APPLE_LOGO_IMAGE } from '../assests/images'
import Ionicons from 'react-native-vector-icons/dist/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/dist/MaterialCommunityIcons';
import MaterialIcons from 'react-native-vector-icons/dist/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthContext } from '../context/AuthProvider';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import auth from '@react-native-firebase/auth';
import Toast from 'react-native-simple-toast';
import { useDispatch, useSelector } from 'react-redux';
import { loginRequest, loginSuccess, loginFailure } from '../redux/actions/authActions';
import { LoginManager, AccessToken } from 'react-native-fbsdk-next';
import LoadingModal from '../components/Modal/LoadingModal';
import { logEvent } from '@amplitude/analytics-react-native';
import PushNotification from 'react-native-push-notification';
import { useThemes } from '../context/ThemeContext';
import { lightColors, darkColors } from '../constants/Color';

const { flex, alignJustifyCenter, alignItemsCenter, borderWidth1, borderRadius5, textDecorationUnderline, resizeModeContain, flexDirectionRow,
  positionAbsolute, textAlign, justifyContentSpaceBetween } = BaseStyle;

const LoginScreen = ({ navigation }: { navigation: any }) => {
  const { setIsLoggedIn } = useContext(AuthContext)
  const { isDarkMode } = useThemes();
  const colors = isDarkMode ? darkColors : lightColors;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [loading, setLoading] = useState(false)
  const [rememberMe, setRememberMe] = useState(false); // State for remember me checkbox
  const dispatch = useDispatch();
  const webClientId = WEBCLIENT_ID_FOR_GOOGLE_LOGIN;

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: webClientId,
    })
    logEvent('Login Screen Initialized');
  }, [])

  const toggleShowPassword = () => {
    logEvent('Show Password icon click on Login Screen');
    setShowPassword(!showPassword);
  };

  //Log in with user Details
  const handleLogin = async () => {
    logEvent('Login Button clicked');
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !password) {
      setEmailError(PLEASE_FILL_ALL_FIELD);
      logEvent(PLEASE_FILL_ALL_FIELD);
      setPasswordError('');
      return;
    }
    if (!rememberMe) {
      Toast.show('Please select the "Remember Me" checkbox');
      return;
    }
    if (!emailPattern.test(email)) {
      setEmailError(INVALID_EMAIL_FORMAT);
      logEvent(INVALID_EMAIL_FORMAT);
      setPasswordError('');
      return;
    }
    if (password.length < 8) {
      setEmailError('');
      logEvent(PASSWORD_MUST_BE_AT);
      setPasswordError(PASSWORD_MUST_BE_AT)
      return;
    }
    try {
      const response = await fetch(`https://admin.appcartify.com:8444/api/customerLogin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
      dispatch(loginRequest({ email, password }));
      if (response.ok) {
        await checkIfUserIsRegistered(email)
        await AsyncStorage.setItem('isUserLoggedIn', response.url)
        setIsLoggedIn(true)
        navigation.navigate("Home");
        dispatch(loginSuccess({ email, password }));
        logEvent('LoginSuccess');
      } else {
        const responseData = await response.json();
        setPasswordError(responseData.message)
        dispatch(loginFailure(responseData.message));
        logEvent(`LoginFailure ${responseData.message}`);
      }
    } catch (error) {
      setPasswordError(error.message || 'An unexpected error occurred')
      console.log('Error activating account:', error);
      dispatch(loginFailure(error));
      logEvent(`LoginFailure: ${error}`);
    }
  };

  const checkIfUserIsRegistered = async (email) => {
    try {
      const response = await fetch(`https://${STOREFRONT_DOMAIN}/admin/api/2024-04/customers.json`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': ADMINAPI_ACCESS_TOKEN,
        },
      });

      if (response.ok) {
        const responseData = await response.json();
        const customers = responseData.customers;

        // Check if any customer matches the provided email
        const customer = customers.find(customer => customer.email === email);

        if (customer) {
          await AsyncStorage.setItem('userDetails', JSON.stringify(customer));
          return true;
        } else {
          return false;
        }
      } else {
        throw new Error('Failed to fetch customers from Shopify');
      }
    } catch (error) {
      console.error('Error checking user registration:', error);
      return false;
    }
  };

  //triggred notification
  const handleNotificationTrigger = () => {
    PushNotification.localNotification({
      channelId: "default-channel-id",
      title: 'Welcome',
      message: 'Thank you for using our app!',
    });
  };

  //register user on shopify
  const registerUserToShopify = async (userData) => {
    try {
      const response = await fetch(`https://${STOREFRONT_DOMAIN}/admin/api/2023-10/customers.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': ADMINAPI_ACCESS_TOKEN,
        },
        body: JSON.stringify({ customer: userData }),
      });

      if (response.ok) {
        return await response.json();
      } else {
        throw new Error('Failed to register user on Shopify');
      }
    } catch (error) {
      console.error('Error registering user on Shopify:', error);
      throw error;
    }
  };

  //login with google
  const googleSignIn = async () => {
    logEvent('GoogleSignUp Button clicked');
    try {
      setLoading(true)
      await GoogleSignin.hasPlayServices();
      const { idToken, user } = await GoogleSignin.signIn();
      const googleCredential = auth.GoogleAuthProvider.credential(idToken);
      await auth().signInWithCredential(googleCredential);
      await AsyncStorage.setItem('userImage', user.photo)
      const { email, givenName, familyName } = user;

      const isRegistered = await checkIfUserIsRegistered(user.email)

      if (isRegistered) {
        Toast.show(`User LoggedIn Succesfully`);
      }
      else {
        // Send user details to Shopify
        const shopifyResponse = await registerUserToShopify({
          email: email,
          password: "defaultPassword",
          password_confirmation: "defaultPassword",
          first_name: givenName,
          last_name: familyName,
        });
        await AsyncStorage.setItem('userDetails', JSON.stringify(shopifyResponse))
        Toast.show(`User Registered Succesfully`);
        handleNotificationTrigger();
      }
      navigation.navigate("Home");
      dispatch(loginSuccess({ email: user.email, password: '' }));
      setLoading(false)

      logEvent('GoogleSignIn Succesfully');
    } catch (error) {
      setLoading(false)
      console.error('Google sign In error:', error);
      logEvent(`Google sign In error:${error}`);
    }
  };

  //login with facebook
  const onFacebookButtonPress = async () => {
    logEvent('Sign up with Facebook Button clicked');
    try {
      const result = await LoginManager.logInWithPermissions(['public_profile', 'email']);
      setLoading(true);

      if (result.isCancelled) {
        logEvent('Sign Up with Facebook cancelled by user');
        throw new Error('User cancelled the login process');
      }

      const data = await AccessToken.getCurrentAccessToken();
      if (!data) {
        throw new Error('Something went wrong obtaining access token');
      }

      const facebookCredential = auth.FacebookAuthProvider.credential(data.accessToken);
      const userCredential = await auth().signInWithCredential(facebookCredential);

      // console.log(userCredential);

      if (userCredential.additionalUserInfo.isNewUser) {
        const { profile } = userCredential.additionalUserInfo;
        const { first_name, last_name, email, picture } = profile;
        await AsyncStorage.setItem('userImage', picture?.data?.url);

        // Check if user is registered in Shopify
        const isRegistered = await checkIfUserIsRegistered(email);

        if (isRegistered) {
          await AsyncStorage.setItem('isUserLoggedIn', profile.id);
          setIsLoggedIn(true);
          navigation.navigate("Home");
          dispatch(loginSuccess({ email, password: '' }));
          setLoading(false);
          logEvent('Sign in with Facebook Success');
        } else {
          // Register the new user to Shopify
          const shopifyResponse = await registerUserToShopify({
            email,
            password: "defaultPassword",
            password_confirmation: "defaultPassword",
            first_name,
            last_name,
          });

          // console.log('Shopify response:', shopifyResponse);
          await AsyncStorage.setItem('userDetails', JSON.stringify(shopifyResponse));
          Toast.show('User Logged In Successfully');
          dispatch(loginSuccess({ email, password: '' }));
          navigation.navigate("Home");
          setLoading(false);
          logEvent('Sign In with Facebook Success');
        }
      } else {
        // Existing user logic
        const { profile } = userCredential.additionalUserInfo;
        await AsyncStorage.setItem('isUserLoggedIn', profile.id);
        setIsLoggedIn(true);
        navigation.navigate("Home");
        dispatch(loginSuccess({ email: profile.email, password: '' }));
        setLoading(false);
        logEvent('Sign In with Facebook Success');
      }
    } catch (error) {
      console.error(error);
      setLoading(false);
      logEvent(`Sign Up with Facebook error: ${error.message}`);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.whiteColor }, flex]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ImageBackground style={[flex, { backgroundColor: colors.whiteColor }]} source={isDarkMode ? '' : BACKGROUND_IMAGE}>
        <TouchableOpacity style={[positionAbsolute, styles.backIcon]} onPress={() => { logEvent(`Back Button Pressed from Login`), navigation.goBack() }}>
          <Ionicons name={"arrow-back"} size={33} color={colors.blackColor} />
        </TouchableOpacity>
        <View style={[styles.logoBox, alignJustifyCenter]}>
          <Text style={[styles.text, { color: colors.blackColor }]}>Welcome Back!</Text>
        </View>
        <View style={[styles.textInputBox]}>
          <Text style={[styles.textInputHeading, { color: colors.blackColor }]}>{EMAIL}</Text>
          <View style={[styles.input, borderRadius5, borderWidth1, flexDirectionRow, alignItemsCenter]}>
            <View style={{ flex: 1 }}>
              <TextInput
                placeholder={EMAIL}
                placeholderTextColor={colors.grayColor}
                onChangeText={(text) => {
                  setEmail(text);
                  if (emailError) {
                    setEmailError('');
                  }
                }}
                value={email}
                keyboardType="email-address"
                autoCapitalize="none"
                style={{ color: colors.blackColor }}
              />
            </View>
          </View>
          {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
          <Text style={[styles.textInputHeading, { color: colors.blackColor }]}>{PASSWORD}</Text>
          <View style={[styles.input, borderRadius5, borderWidth1, flexDirectionRow, alignItemsCenter]}>
            <View style={{ flex: 1 }}>
              <TextInput
                placeholder={PASSWORD}
                placeholderTextColor={colors.grayColor}
                onChangeText={(text) => {
                  setPassword(text);
                  if (passwordError) {
                    setPasswordError('');
                  }
                }}
                value={password}
                secureTextEntry={!showPassword}
                style={{ color: colors.blackColor }}
              />
            </View>
            <TouchableOpacity onPress={toggleShowPassword}>
              <MaterialCommunityIcons name={showPassword ? "eye" : "eye-off"} size={20} color={colors.grayColor} />
            </TouchableOpacity>
          </View>
          {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
          <View style={[{ width: "100%", height: hp(5) }, flexDirectionRow, justifyContentSpaceBetween]}>
            <View style={[flexDirectionRow, alignItemsCenter, { height: hp(3) }]}>
              <TouchableOpacity onPress={() => setRememberMe(!rememberMe)}>
                {rememberMe ? <Ionicons name={'checkbox'} size={20} color={colors.redColor} />
                  : <MaterialIcons name="check-box-outline-blank" size={20} color={colors.redColor} />}
              </TouchableOpacity>
              <Text style={[{ color: colors.blackColor }]}>{REMEMBER_ME}</Text>
            </View >
            <TouchableOpacity
              onPress={() => navigation.navigate("ForgetPasswordScreen")}
            >
              <Text style={[{ color: redColor }]}>{FORGET_PASSWORD}</Text>
            </TouchableOpacity>
          </View>
          <Pressable style={[styles.button, alignItemsCenter, borderRadius5]} onPress={handleLogin}>
            <Text style={styles.buttonText}>{LOGIN}</Text>
          </Pressable>
          <Pressable style={[{ width: "100%" }, alignJustifyCenter]} onPress={() => { logEvent('SignUp Button clicked From Login Screen'), navigation.navigate("Register") }}>
            <Text style={[{ marginTop: spacings.Large1x, color: colors.blackColor }]}>{DONT_HAVE_AN_ACCOUNT}<Text style={[{ color: colors.redColor }]}>{REGISTER}</Text></Text>
          </Pressable>
          <View style={[flexDirectionRow, alignJustifyCenter, { width: "100%", marginTop: spacings.large }]}>
            <View style={{ height: 1, backgroundColor: colors.grayColor, width: "46%" }}></View>
            <Text style={[{ color: colors.blackColor, marginVertical: spacings.xxxxLarge, marginHorizontal: spacings.small }, textAlign]}>or</Text>
            <View style={{ height: 1, backgroundColor: colors.grayColor, width: "46%" }}></View>
          </View>
          <View style={[styles.socialAuthBox, alignJustifyCenter, flexDirectionRow]}>
            <TouchableOpacity style={[styles.socialButton, alignJustifyCenter]} onPress={googleSignIn}>
              <Image source={GOOGLE_LOGO_IMAGE} style={[{ width: wp(6), height: hp(4) }, resizeModeContain]} />
            </TouchableOpacity>
            {Platform.OS === 'ios' && <TouchableOpacity style={[styles.socialButton, alignJustifyCenter]}>
              <Image source={APPLE_LOGO_IMAGE} style={[{ width: wp(6), height: hp(4) }, resizeModeContain]} />
            </TouchableOpacity>}
          </View>
          <Text style={[{ marginTop: spacings.Large1x, color: colors.blackColor }, textAlign]}>{BY_CONTINUING_YOU_AGREE}</Text>
          <View style={[flexDirectionRow, { marginTop: spacings.large, width: "100%" }, alignJustifyCenter]}>
            <TouchableOpacity onPress={() => {
              navigation.navigate('WebViewScreen', {
                headerText: TERM_OF_SERVICES
              }),
                logEvent('Terms Of Services From login');
            }}>
              <Text style={[{ color: colors.blackColor, margin: 4 }, textDecorationUnderline]}>{TERM_OF_SERVICES}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => {
              navigation.navigate('WebViewScreen', {
                headerText: PRIVACY_POLICY
              }),
                logEvent('Privacy Ploicy From login');
            }}>
              <Text style={[{ color: colors.blackColor, margin: 4 }, textDecorationUnderline]}>{PRIVACY_POLICY}</Text>
            </TouchableOpacity>

          </View>
        </View>
      </ImageBackground >
      {loading &&
        <LoadingModal visible={loading} />
      }

    </KeyboardAvoidingView >
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: whiteColor
  },
  text: {
    fontSize: style.fontSizeLarge3x.fontSize,
    fontWeight: style.fontWeightMedium1x.fontWeight,
    color: blackColor,
    fontFamily: 'GeneralSans-Variable'
  },
  textInputHeading: {
    fontSize: style.fontSizeNormal1x.fontSize,
    fontWeight: style.fontWeightThin.fontWeight,
    color: blackColor
  },
  input: {
    width: '100%',
    height: hp(6),
    borderColor: grayColor,
    paddingHorizontal: spacings.xLarge,
    marginVertical: spacings.large,
  },
  button: {
    width: '100%',
    backgroundColor: redColor,
    paddingVertical: spacings.xLarge,
    marginTop: spacings.Large1x
  },
  buttonText: {
    color: whiteColor,
    fontSize: style.fontSizeLarge.fontSize,
    fontWeight: style.fontWeightThin.fontWeight,
  },
  textInputBox: {
    width: "100%",
    height: hp(60)
  },
  logoBox: {
    width: "100%",
    height: hp(18),
    marginTop: spacings.Large1x
  },
  errorText: {
    color: redColor
  },
  backIcon: {
    top: -15,
    left: -10,
    width: wp(10),
    height: hp(5)
  },
  socialAuthBox: {
    width: '100%',
  },
  socialButton: {
    width: wp(12),
    height: wp(12),
    borderRadius: 50,
    borderWidth: .5,
    borderColor: grayColor,
    marginHorizontal: spacings.large
  }
});

export default LoginScreen;
