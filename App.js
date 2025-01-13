// Importing necessary components and modules from React Native and React
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  Image,
  TextInput,
  TouchableOpacity,
  Animated,
  Easing,
  Switch,
  Alert,
  ScrollView,
  Dimensions,
  ActivityIndicator
} from "react-native";
import React from "react";

const App = () => {
  // State declarations
  const [data, setData] = React.useState(null); // Holds weather data for the selected city
  const [city, setCity] = React.useState("Manila"); // Default city
  const [inputCity, setInputCity] = React.useState(""); // User input for city search
  const [inputLocation, setInputLocation] = React.useState(""); // User's starting location for travel
  const [inputDestination, setInputDestination] = React.useState(""); // User's travel destination
  const [safeRoute, setSafeRoute] = React.useState([]); // Weather and safety data for the travel route
  const [isDarkMode, setIsDarkMode] = React.useState(false); // Dark mode toggle
  const [loading, setLoading] = React.useState(false); // Loading indicator for async operations

  // Animated value for moving clouds
  const cloudAnim = React.useRef(new Animated.Value(0)).current;

  // Reference for horizontal scroll view
  const scrollViewRef = React.useRef(null);

  // Fetch weather data for the specified city
  const fetchWeatherData = (city) => {
    setLoading(true); // Start loading
    fetch(`http://api.weatherapi.com/v1/forecast.json?key=YOUR_API_KEY&q=${city}&days=7`)
      .then(response => response.json())
      .then(data => {
        if (data.error) {
          Alert.alert("Error", "Invalid city name. Please try again.");
        } else {
          setData(data);
          checkWeatherAlerts(data); // Check for rain alerts
        }
      })
      .catch(() => {
        Alert.alert("Error", "Failed to fetch weather data. Please try again later.");
      })
      .finally(() => setLoading(false)); // Stop loading
  };

  // Generate intermediate cities for a route based on the start and end points
  const generateRouteCities = (start, end) => {
    const routeCities = [start, end];
    if (start === "Manila" && end === "Batangas") {
      routeCities.push("Tagaytay", "Dasmariñas");
    }
    return routeCities.join(" → ");
  };

  // Fetch weather data for all cities along a travel route
  const fetchRouteData = async (start, end) => {
    setLoading(true); // Start loading
    const routeCities = generateRouteCities(start, end);
    const routeWeather = [];
    let unsafeConditions = false;

    for (const city of routeCities) {
      try {
        const response = await fetch(
          `http://api.weatherapi.com/v1/current.json?key=YOUR_API_KEY&q=${city}`
        );
        const data = await response.json();
        if (data.error) {
          Alert.alert("Error", `Failed to fetch weather for ${city}`);
        } else {
          const isSafe = !data.current.condition.text.toLowerCase().includes("thunderstorm") &&
                         !data.current.condition.text.toLowerCase().includes("tornado") &&
                         data.current.precip_mm <= 10;

          routeWeather.push({
            city,
            condition: data.current.condition.text,
            chanceOfRain: data.current.precip_mm > 0 ? "High" : "Low",
            isSafe,
          });

          if (!isSafe) unsafeConditions = true;
        }
      } catch {
        Alert.alert("Error", "Failed to fetch route data.");
      }
    }

    setSafeRoute(routeWeather);

    // Show alerts based on travel conditions
    if (unsafeConditions) {
      Alert.alert(
        "Travel Alert",
        "One or more locations along your route may have unsafe travel conditions. Proceed with caution or consider delaying your trip."
      );
    } else {
      Alert.alert(
        "Travel Alert",
        "Your route appears to be safe for travel. Have a good trip!"
      );
    }
    setLoading(false); // Stop loading
  };

  // Check for upcoming rain alerts within 12 hours
  const checkWeatherAlerts = (data) => {
    const forecast = data.forecast.forecastday[0].hour;
    let closestRain = null;

    forecast.forEach(hour => {
      const hourTime = new Date(hour.time);
      const now = new Date();
      const hoursDifference = (hourTime - now) / (1000 * 60 * 60);

      if (hour.chance_of_rain > 0 && hoursDifference <= 12) {
        if (!closestRain || hourTime < new Date(closestRain.time)) {
          closestRain = hour;
        }
      }
    });

    if (closestRain) {
      const rainIntensity =
        closestRain.chance_of_rain > 80
          ? "a heavy"
          : closestRain.chance_of_rain > 50
          ? "a moderate"
          : "a light";

      Alert.alert(
        "Rain Alert",
        `There is ${rainIntensity} rain expected within the next 12 hours.`,
        [{ text: "OK", style: "default" }]
      );
    }
  };

  // Provide travel advice based on weather condition and temperature
  const getTravelAdvice = (condition, temp_c) => {
    if (!condition) return "Weather data unavailable. Please check again later.";
    if (condition.includes("thunderstorm") || condition.includes("tornado")) {
      return "Severe weather warning. It’s not safe to travel in these conditions.";
    }
    if (condition.includes("rain")) {
      return "Pack an umbrella or raincoat. Drive carefully and stay updated on weather alerts.";
    }
    return "Weather looks good! Enjoy your trip.";
  };

  // Search for weather data of the user-input city
  const handleSearch = () => {
    if (inputCity.trim() === "") {
      Alert.alert("Error", "Please enter a city name.");
    } else {
      setCity(inputCity);
    }
  };

  const handleRouteSearch = () => {
    if (!inputLocation || !inputDestination) {
      Alert.alert("Error", "Please enter both your location and destination.");
    } else {
      fetchRouteData(inputLocation, inputDestination);
    }
  };

  React.useEffect(() => {
    fetchWeatherData(city);
    Animated.loop(
      Animated.timing(cloudAnim, {
        toValue: 1,
        duration: 10000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, [city]);

  const { width } = Dimensions.get('window');
  const conditionFontSize = width < 350 ? 18 : 24;

  return (
    <SafeAreaView style={[styles.container, isDarkMode && styles.darkContainer]}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007BFF" />
        </View>
      ) : (
        <>
          <Animated.View style={[styles.cloudContainer, { transform: [{ translateX: cloudAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }) }] }]}>          
            <Image source={require('./assets/cloud.png')} style={styles.cloud} />
          </Animated.View>
          <View style={styles.header}>
            <Text style={styles.headerText}>Weathering With Us</Text>
            <Switch value={isDarkMode} onValueChange={() => setIsDarkMode(!isDarkMode)} />
          </View>

          <View style={styles.searchContainer}>
            <TextInput style={styles.input} placeholder="Enter city" value={inputCity} onChangeText={setInputCity} />
            <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
              <Text style={styles.searchButtonText}>Search</Text>
            </TouchableOpacity>
          </View>

          {data && (
            <ScrollView>
              <View style={styles.weatherContainer}>
                <Text style={styles.location}>{data.location.name}, {data.location.country}</Text>
                <Text style={styles.temperature}>{data.current.temp_c}°C</Text>
                <Image style={styles.icon} source={{ uri: `http:${data.current.condition.icon}` }} />
                <Text style={[styles.condition, { fontSize: conditionFontSize }]}>{data.current.condition.text}</Text>
                <Text style={styles.details}>Humidity: {data.current.humidity}%</Text>
                <Text style={styles.details}>Wind: {data.current.wind_kph} kph {data.current.wind_dir}</Text>
                <Text style={styles.details}>Pressure: {data.current.pressure_mb} mb</Text>
              </View>

              <View style={styles.forecastContainer}>
                <Text style={styles.forecastTitle}>7-Day Forecast</Text>
                {data.forecast.forecastday.map((day, index) => (
                  <View key={index} style={styles.dailyForecast}>
                    <Text style={styles.day}>{new Date(day.date).toDateString()}</Text>
                    <Image style={styles.icon} source={{ uri: `http:${day.day.condition.icon}` }} />
                    <Text style={styles.temp}>{day.day.avgtemp_c}°C</Text>
                    <Text style={styles.condition}>{day.day.condition.text}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.forecastContainer}>
                <Text style={styles.forecastTitle}>24-Hour Forecast</Text>
                <ScrollView horizontal ref={scrollViewRef} showsHorizontalScrollIndicator={false}>
                  {data.forecast.forecastday[0].hour.map((hour, index) => (
                    <View key={index} style={styles.hourlyForecast}>
                      <Text style={styles.hour}>{new Date(hour.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}</Text>
                      <Image style={styles.icon} source={{ uri: `http:${hour.condition.icon}` }} />
                      <Text style={styles.temp}>{hour.temp_c}°C</Text>
                    </View>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.plannerContainer}>
                <Text style={styles.plannerTitle}>Travel Planner</Text>
                <TextInput style={styles.input} placeholder="Your Location" value={inputLocation} onChangeText={setInputLocation} />
                <TextInput style={styles.input} placeholder="Destination" value={inputDestination} onChangeText={setInputDestination} />
                <TouchableOpacity style={styles.searchButton} onPress={handleRouteSearch}>
                  <Text style={styles.searchButtonText}>Find Safe Route</Text>
                </TouchableOpacity>

                {data && (
                  <Text style={styles.advice}>
                    {getTravelAdvice(data.current.condition.text, data.current.temp_c)}
                  </Text>
                )}
              </View>

              {safeRoute.length > 0 && (
                <View style={styles.routeContainer}>
                  <Text style={styles.routeTitle}>Route</Text>
                  <Text style={styles.routeText}>
                    {safeRoute.map(({ city, condition, isSafe }) => `${city} (${condition}${isSafe ? " - Safe" : " - Unsafe"})`).join(" → ")}
                  </Text>
                </View>
              )}
            </ScrollView>
          )}
        </>
      )}
    </SafeAreaView>
  );
};

//design
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  darkContainer: {
    backgroundColor: '#2c3e50',
    color: 'ffffff',
  },
  cloudContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  cloud: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    marginBottom: 10,
  },
  headerText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  searchContainer: {
    width: '100%',
    marginBottom: 20,
  },
  input: {
    width: '100%',
    height: 40,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    paddingLeft: 10,
    marginBottom: 10,
  },
  searchButton: {
    backgroundColor: '#007BFF',
    paddingVertical: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  weatherContainer: {
    width: '100%',
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 20,
  },
  location: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  temperature: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  icon: {
    width: 50,
    height: 50,
  },
  condition: {
    fontSize: 24,
    marginBottom: 10,
  },
  details: {
    fontSize: 14,
    color: '#555',
  },
  forecastContainer: {
    width: '100%',
    marginBottom: 20,
  },
  forecastTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  dailyForecast: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
  },
  day: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  temp: {
    fontSize: 16,
    marginTop: 5,
  },
  hourlyForecast: {
    width: 70,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  hour: {
    fontSize: 14,
    marginBottom: 5,
  },
  plannerContainer: {
    width: '100%',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 8,
    marginBottom: 20,
  },
  plannerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  advice: {
    fontSize: 16,
    marginTop: 10,
  },
  routeContainer: {
    width: '100%',
    backgroundColor: '#fff',
	padding: 10,
    borderRadius: 8,
    marginBottom: 20,
  },
  routeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  routeText: {
    fontSize: 20,
  },
});

export default App;
	
